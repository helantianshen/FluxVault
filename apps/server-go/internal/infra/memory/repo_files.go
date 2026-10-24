// 文件仓储：在锁内完成状态转换、筛选及分页

package memory

import (
	"context"
	"sort"
	"strings"
	"time"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/storage"
)

type fileRepository struct{ *store }

// CreateFile 在写锁内复核实例上传能力和文件唯一性后保存元数据
func (s *fileRepository) CreateFile(_ context.Context, f file.File) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	i, ok := s.instances[f.InstanceID]
	if !ok {
		return fault.NotFound()
	}
	if err := i.Accept(f.Visibility); err != nil {
		return err
	}
	if _, ok := s.files[f.ID]; ok {
		return file.ErrFileExists
	}
	s.files[f.ID] = f
	return nil
}

// FindFile 在读锁内查找文件，不存在时返回统一领域错误
func (s *fileRepository) FindFile(_ context.Context, id string) (file.File, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	f, ok := s.files[id]
	if !ok {
		return f, fault.NotFound()
	}
	return f, nil
}

// ListFiles 按归属和筛选条件选取文件，稳定排序后返回分页结果
func (s *fileRepository) ListFiles(_ context.Context, filter file.Filter) (file.Page, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := []file.File{}
	for _, f := range s.files {
		ownerMismatch := filter.OwnerID != "" && f.OwnerID != filter.OwnerID
		stateMismatch := filter.State != "" && f.State != filter.State
		visibilityMismatch := filter.Visibility != "" && f.Visibility != filter.Visibility
		instanceMismatch := filter.InstanceID != "" && f.InstanceID != filter.InstanceID
		nameMismatch := !strings.Contains(strings.ToLower(f.Name), strings.ToLower(filter.Query))
		if ownerMismatch || stateMismatch || visibilityMismatch || instanceMismatch || nameMismatch {
			continue
		}
		items = append(items, f)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].ID > items[j].ID
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	total := len(items)
	start, end := filter.Params.Bounds(total)
	return file.Page{Items: items[start:end], Total: total, Limit: filter.Limit, Offset: filter.Offset}, nil
}

// CompleteFile 仅允许 pending 在写锁内转为 ready，同时确认定位符和字节数
func (s *fileRepository) CompleteFile(_ context.Context, id string, locator storage.Locator, size int64) (file.File, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	f, ok := s.files[id]
	if !ok {
		return f, fault.NotFound()
	}
	if f.State != "pending" {
		return f, file.ErrNotPending
	}
	f.Locator = locator
	f.Size = size
	f.State = "ready"
	f.LastError = ""
	f.UpdatedAt = time.Now().UTC()
	s.files[id] = f
	return f, nil
}

// RecordFailure 在写锁内保留安全错误代码和更新时间，不改变文件状态
func (s *fileRepository) RecordFailure(_ context.Context, id, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	f, ok := s.files[id]
	if !ok {
		return fault.NotFound()
	}
	f.LastError = code
	f.UpdatedAt = time.Now().UTC()
	s.files[id] = f
	return nil
}

// BeginDelete 拒绝删除 pending 文件，并在写锁内设置可重试的 deleting 状态
func (s *fileRepository) BeginDelete(_ context.Context, id string) (file.File, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	f, ok := s.files[id]
	if !ok {
		return f, fault.NotFound()
	}
	if f.State == "pending" {
		return f, file.ErrPendingDelete
	}
	f.State = "deleting"
	f.UpdatedAt = time.Now().UTC()
	s.files[id] = f
	return f, nil
}

// RemoveFile 仅移除 deleting 元数据，记录已不存在时按幂等成功处理
func (s *fileRepository) RemoveFile(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	f, ok := s.files[id]
	if !ok {
		return nil
	}
	if f.State != "deleting" {
		return file.ErrNotDeleting
	}
	delete(s.files, id)
	return nil
}
