// 密钥仓储：维护摘要及状态，并隔离可变元数据副本

package memory

import (
	"context"
	"sort"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/identity"
)

type keyRepository struct{ *store }

// cloneKey 复制权限切片和到期时间，避免调用方修改内存仓储持有的状态
func cloneKey(k identity.APIKey) identity.APIKey {
	k.Scopes = append([]string{}, k.Scopes...)
	if k.ExpiresAt != nil {
		t := *k.ExpiresAt
		k.ExpiresAt = &t
	}
	return k
}

// ListKeys 返回密钥元数据副本，并按创建时间倒序排列
func (s *keyRepository) ListKeys(_ context.Context) ([]identity.APIKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := []identity.APIKey{}
	for _, k := range s.keys {
		result = append(result, cloneKey(k))
	}
	sort.Slice(result, func(i, j int) bool { return result[i].CreatedAt.After(result[j].CreatedAt) })
	return result, nil
}

// FindKeyByHash 在读锁内匹配高熵密钥摘要，返回独立元数据副本
func (s *keyRepository) FindKeyByHash(_ context.Context, hash string) (identity.APIKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, k := range s.keys {
		if k.Hash == hash {
			return cloneKey(k), nil
		}
	}
	return identity.APIKey{}, fault.NotFound()
}

// CreateKey 在写锁内保存密钥副本，避免共享可变字段
func (s *keyRepository) CreateKey(_ context.Context, k identity.APIKey) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.keys[k.ID] = cloneKey(k)
	return nil
}

// SetKeyStatus 在同一写锁内校验撤销终态并持久化新状态
func (s *keyRepository) SetKeyStatus(_ context.Context, id, status string) (identity.APIKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	k, ok := s.keys[id]
	if !ok {
		return k, fault.NotFound()
	}
	if err := identity.ValidateStatus(k.Status, status); err != nil {
		return k, err
	}
	k.Status = status
	s.keys[id] = k
	return cloneKey(k), nil
}

// RotateKey 拒绝轮换已撤销密钥，原子替换摘要和可展示前缀
func (s *keyRepository) RotateKey(_ context.Context, id, hash, prefix string) (identity.APIKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	k, ok := s.keys[id]
	if !ok {
		return k, fault.NotFound()
	}
	if k.Status == "revoked" {
		return k, identity.ErrRevokedRotation
	}
	k.Hash = hash
	k.Prefix = prefix
	s.keys[id] = k
	return cloneKey(k), nil
}
