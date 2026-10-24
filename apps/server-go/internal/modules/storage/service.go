// 实例服务：管理配置与实例生命周期

package storage

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Service 管理存储实例配置和生命周期
type Service struct{ instanceRepo Repository }

// NewService 注入存储实例仓储
func NewService(repo Repository) *Service { return &Service{instanceRepo: repo} }

// CreateInput 承载实例创建所需配置，不含真实凭据
type CreateInput struct {
	Name, Provider, SecretRef string
	PrivateSupported          bool
}

// Create 生成实例标识并校验配置，持久化后返回实例元数据
func (s *Service) Create(ctx context.Context, cmd CreateInput) (Instance, error) {
	i := Instance{
		ID:               uuid.NewString(),
		Name:             strings.TrimSpace(cmd.Name),
		Provider:         cmd.Provider,
		SecretRef:        cmd.SecretRef,
		PrivateSupported: cmd.PrivateSupported,
		Enabled:          true,
		CreatedAt:        time.Now().UTC(),
	}
	if err := i.Validate(); err != nil {
		return i, err
	}
	return i, s.instanceRepo.CreateInstance(ctx, i)
}

// Update 校验非空更新和名称长度，再更新实例的名称或启用状态
func (s *Service) Update(ctx context.Context, id string, name *string, enabled *bool) (Instance, error) {
	if name == nil && enabled == nil {
		return Instance{}, ErrEmptyUpdate
	}
	if name != nil {
		*name = strings.TrimSpace(*name)
		if *name == "" || len(*name) > 120 {
			return Instance{}, ErrInstanceName
		}
	}
	return s.instanceRepo.UpdateInstance(ctx, id, name, enabled)
}

// List 返回管理员可管理的全部存储实例
func (s *Service) List(ctx context.Context) ([]Instance, error) {
	return s.instanceRepo.ListInstances(ctx)
}

// Delete 删除未被文件引用的实例，引用约束由仓储原子检查
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.instanceRepo.RemoveInstance(ctx, id)
}

// Get 返回内部文件流程所需实例配置，不公开 Secret 的实际值
func (s *Service) Get(ctx context.Context, id string) (Instance, error) {
	return s.instanceRepo.FindInstance(ctx, id)
}

// ForUpload 检查实例存在性、启用状态及上传可见性能力
func (s *Service) ForUpload(ctx context.Context, id, visibility string) (Instance, error) {
	instance, err := s.instanceRepo.FindInstance(ctx, id)
	if err != nil {
		return instance, err
	}
	return instance, instance.Accept(visibility)
}
