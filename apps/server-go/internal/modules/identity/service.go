// 密钥服务：签发、轮换、认证与状态管理

package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Service 管理 API Key 签发、认证和状态
type Service struct{ keyRepo Repository }

// NewService 注入 API Key 仓储
func NewService(repo Repository) *Service { return &Service{keyRepo: repo} }

// HashKey 对高熵 API Key 计算 SHA-256 摘要并编码为十六进制，不能用于密码散列
func HashKey(secret string) string {
	hash := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(hash[:])
}

// newSecret 生成 32 字节密码学随机数，以无填充 URL 安全 Base64 编码返回密钥原文
func newSecret() (string, error) {
	// 32 字节来自密码学随机源，避免可预测的 API Key
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// URL 安全编码不带填充，前缀用于区分凭据格式
	return "fv_" + base64.RawURLEncoding.EncodeToString(bytes), nil
}

// CreateInput 承载密钥名称、权限集合与可选到期时间
type CreateInput struct {
	Name      string
	Scopes    []string
	ExpiresAt *time.Time
}

// Create 校验名称、scope 和到期时间，保存密钥摘要后返回一次性原文
func (s *Service) Create(ctx context.Context, cmd CreateInput) (APIKey, string, error) {
	if strings.TrimSpace(cmd.Name) == "" || len(cmd.Name) > 120 {
		return APIKey{}, "", ErrKeyName
	}
	if err := ValidateScopes(cmd.Scopes); err != nil {
		return APIKey{}, "", err
	}
	now := time.Now().UTC()
	if cmd.ExpiresAt != nil && !cmd.ExpiresAt.After(now) {
		return APIKey{}, "", ErrExpiry
	}
	secret, err := newSecret()
	if err != nil {
		return APIKey{}, "", err
	}
	key := APIKey{
		ID:        uuid.NewString(),
		Name:      strings.TrimSpace(cmd.Name),
		Hash:      HashKey(secret),
		Prefix:    secret[:11],
		Scopes:    cmd.Scopes,
		Status:    "enabled",
		ExpiresAt: cmd.ExpiresAt,
		CreatedAt: now,
	}
	if err = s.keyRepo.CreateKey(ctx, key); err != nil {
		return key, "", err
	}
	return key, secret, nil
}

// Rotate 生成新随机凭据并替换摘要，成功后才返回新密钥原文
func (s *Service) Rotate(ctx context.Context, id string) (APIKey, string, error) {
	secret, err := newSecret()
	if err != nil {
		return APIKey{}, "", err
	}
	key, err := s.keyRepo.RotateKey(ctx, id, HashKey(secret), secret[:11])
	if err != nil {
		return key, "", err
	}
	return key, secret, nil
}

// Authenticate 按摘要查找仍有效的密钥，查询失败或过期统一返回认证错误
func (s *Service) Authenticate(ctx context.Context, secret string) (Principal, error) {
	key, err := s.keyRepo.FindKeyByHash(ctx, HashKey(secret))
	if err != nil || !key.Active(time.Now()) {
		return Principal{}, ErrInvalidKey
	}
	return Principal{KeyID: key.ID, Scopes: key.Scopes}, nil
}

// List 返回密钥元数据，传输层仅输出不含哈希的视图
func (s *Service) List(ctx context.Context) ([]APIKey, error) {
	return s.keyRepo.ListKeys(ctx)
}

// UpdateStatus 更新密钥状态，仓储在锁内执行撤销终态校验
func (s *Service) UpdateStatus(ctx context.Context, id, status string) (APIKey, error) {
	return s.keyRepo.SetKeyStatus(ctx, id, status)
}
