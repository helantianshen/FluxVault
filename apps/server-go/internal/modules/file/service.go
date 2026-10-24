// 文件服务：协调上传、查询、下载与可重试删除

package file

import (
	"context"
	"errors"
	"io"
	"time"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/identity"
	"fluxvault/server-go/internal/modules/storage"

	"github.com/google/uuid"
)

// Service 管理文件状态、访问权限和正文存储流程
type Service struct {
	fileRepo    Repository
	instances   InstanceService
	objectStore ObjectStore
}

// NewService 注入文件仓储、存储实例业务能力和对象存储
func NewService(repo Repository, instances InstanceService, objects ObjectStore) *Service {
	return &Service{fileRepo: repo, instances: instances, objectStore: objects}
}

// InstanceService 只暴露文件流程需要的实例读取和上传许可判断
// 实例的启用状态与私有能力由 storage.Service 判定
type InstanceService interface {
	Get(context.Context, string) (storage.Instance, error)
	ForUpload(context.Context, string, string) (storage.Instance, error)
}

// ObjectStore 定义正文写入、读取和删除能力，返回流由调用方关闭
type ObjectStore interface {
	Upload(context.Context, storage.Instance, string, io.Reader) (storage.Locator, int64, error)
	Download(context.Context, storage.Instance, storage.Locator) (io.ReadCloser, error)
	Delete(context.Context, storage.Instance, storage.Locator) error
}

// UploadInput 承载一次文件上传的元数据和原始正文流
type UploadInput struct {
	Name, InstanceID, Visibility, ContentType string
	Body                                      io.Reader
}

// Upload 检查上传权限和实例能力，先保存 pending 再写正文，只有元数据确认成功才返回 ready
func (s *Service) Upload(ctx context.Context, p identity.Principal, cmd UploadInput) (File, error) {
	if !p.Has("upload") {
		return File{}, ErrUploadScope
	}
	if err := ValidateName(cmd.Name); err != nil {
		return File{}, err
	}
	if cmd.Visibility == "" {
		cmd.Visibility = "private"
	}
	if cmd.Visibility != "private" && cmd.Visibility != "public" {
		return File{}, ErrVisibility
	}
	instance, err := s.instances.ForUpload(ctx, cmd.InstanceID, cmd.Visibility)
	if err != nil {
		return File{}, err
	}
	// 先建立 pending 记录，远端失败时仍能返回可排查的文件 ID
	now := time.Now().UTC()
	f := File{
		ID:          uuid.NewString(),
		Name:        cmd.Name,
		InstanceID:  instance.ID,
		OwnerID:     p.Owner(),
		Visibility:  cmd.Visibility,
		State:       "pending",
		ContentType: cmd.ContentType,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err = s.fileRepo.CreateFile(ctx, f); err != nil {
		return File{}, err
	}
	locator, size, err := s.objectStore.Upload(ctx, instance, f.ID, cmd.Body)
	if err != nil {
		code := "storage_failure"
		var e *fault.Error
		if errors.As(err, &e) {
			code = e.Code
		}
		_ = s.fileRepo.RecordFailure(context.WithoutCancel(ctx), f.ID, code)
		return File{}, &fault.Error{Code: code, Message: "上传未完成，文件记录已保留供排查", FileID: f.ID}
	}
	// 远端成功不等于业务完成，只有条件更新成功才返回 ready
	fileID := f.ID
	f, err = s.fileRepo.CompleteFile(ctx, fileID, locator, size)
	if err != nil {
		_ = s.fileRepo.RecordFailure(context.WithoutCancel(ctx), fileID, "metadata_failure")
		return File{}, &fault.Error{Code: "metadata_failure", Message: "远端内容已写入，但元数据确认失败，请排查待完成记录", FileID: fileID}
	}
	return f, nil
}

// List 校验读取 scope 并收紧非管理员的归属筛选，再执行仓储分页查询
func (s *Service) List(ctx context.Context, p identity.Principal, filter Filter) (Page, error) {
	if !p.Has("read") {
		return Page{}, ErrReadScope
	}
	if !p.Admin {
		filter.OwnerID = p.KeyID
	}
	return s.fileRepo.ListFiles(ctx, filter)
}

// Get 仅返回管理员或有读取权限的所有者可见的文件元数据
func (s *Service) Get(ctx context.Context, p identity.Principal, id string) (File, error) {
	f, err := s.fileRepo.FindFile(ctx, id)
	if err != nil {
		return f, err
	}
	if !p.Admin && (!p.Has("read") || f.OwnerID != p.KeyID) {
		return File{}, fault.NotFound()
	}
	return f, nil
}

// Download 验证文件状态和访问权限，解析实例后返回需调用方关闭的代理下载流
func (s *Service) Download(ctx context.Context, p identity.Principal, id, mode string) (File, io.ReadCloser, error) {
	f, err := s.fileRepo.FindFile(ctx, id)
	if err != nil {
		return f, nil, err
	}
	if err = f.Downloadable(p); err != nil {
		return f, nil, err
	}
	if mode == "direct" {
		return f, nil, ErrDirectUnavailable
	}
	instance, err := s.instances.Get(ctx, f.InstanceID)
	if err != nil {
		return f, nil, err
	}
	body, err := s.objectStore.Download(ctx, instance, f.Locator)
	return f, body, err
}

// Delete 先保存 deleting，再按 Provider 语义清理远端和元数据，失败保留可重试记录
func (s *Service) Delete(ctx context.Context, p identity.Principal, id string) error {
	f, err := s.fileRepo.FindFile(ctx, id)
	if err != nil {
		return err
	}
	if !f.CanDelete(p) {
		return fault.NotFound()
	}
	instance, err := s.instances.Get(ctx, f.InstanceID)
	if err != nil {
		return err
	}
	// 先持久化 deleting，远端或元数据删除失败都保留重试入口
	f, err = s.fileRepo.BeginDelete(ctx, id)
	if err != nil {
		return err
	}
	// Telegram 保留远端文档；其他存储必须先成功删除正文
	if !instance.MetadataOnlyDelete() {
		if err = s.objectStore.Delete(ctx, instance, f.Locator); err != nil {
			_ = s.fileRepo.RecordFailure(context.WithoutCancel(ctx), id, "storage_failure")
			return &fault.Error{Code: "storage_failure", Message: "远端删除失败，已保留删除中记录，可重试", FileID: id}
		}
	}
	if err = s.fileRepo.RemoveFile(ctx, id); err != nil {
		_ = s.fileRepo.RecordFailure(context.WithoutCancel(ctx), id, "metadata_failure")
		return &fault.Error{Code: "metadata_failure", Message: "清理文件记录失败，可重试删除", FileID: id}
	}
	return nil
}
