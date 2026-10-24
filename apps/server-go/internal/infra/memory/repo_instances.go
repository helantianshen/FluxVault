// 实例仓储：维护配置并原子检查文件引用

package memory

import (
	"context"
	"sort"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/storage"
)

type instanceRepository struct{ *store }

// ListInstances 返回按标识排序的实例列表，读取过程由读锁保护
func (s *instanceRepository) ListInstances(_ context.Context) ([]storage.Instance, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := []storage.Instance{}
	for _, i := range s.instances {
		result = append(result, i)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result, nil
}

// FindInstance 在读锁内按标识查询实例，不存在时返回领域错误
func (s *instanceRepository) FindInstance(_ context.Context, id string) (storage.Instance, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	i, ok := s.instances[id]
	if !ok {
		return i, fault.NotFound()
	}
	return i, nil
}

// CreateInstance 在写锁内检查实例标识唯一性并保存配置
func (s *instanceRepository) CreateInstance(_ context.Context, i storage.Instance) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.instances[i.ID]; ok {
		return storage.ErrInstanceExists
	}
	s.instances[i.ID] = i
	return nil
}

// UpdateInstance 在写锁内更新明确提供的名称和启用状态
func (s *instanceRepository) UpdateInstance(_ context.Context, id string, name *string, enabled *bool) (storage.Instance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	i, ok := s.instances[id]
	if !ok {
		return i, fault.NotFound()
	}
	if name != nil {
		i.Name = *name
	}
	if enabled != nil {
		i.Enabled = *enabled
	}
	s.instances[id] = i
	return i, nil
}

// RemoveInstance 在同一写锁内检查文件引用后删除实例，避免先查后删竞态
func (s *instanceRepository) RemoveInstance(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.instances[id]; !ok {
		return fault.NotFound()
	}
	for _, f := range s.files {
		if f.InstanceID == id {
			return storage.ErrInstanceInUse
		}
	}
	delete(s.instances, id)
	return nil
}
