// 管理员认证服务：密码验证、登录限流及 JWT 签验

// Package auth 管理管理员登录、密码验证与 JWT 认证
package auth

import (
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Service 保存管理员认证材料和进程内登录尝试窗口
type Service struct {
	username string
	hash     []byte
	secret   []byte
	ttl      time.Duration
	mu       sync.Mutex
	attempts int
	window   time.Time
}

// NewService 使用 bcrypt 成本 12 生成管理员密码哈希，并保存 JWT 签名材料和有效期
func NewService(username, password, secret string, ttl time.Duration) (*Service, error) {
	// bcrypt 成本参数 12 对应指数工作因子，由库管理盐和比较过程
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return nil, err
	}
	return &Service{
		username: username,
		hash:     hash,
		secret:   []byte(secret),
		ttl:      ttl,
	}, nil
}

// NewServiceWithHash 复用持久化摘要，不在重启时重新生成或覆盖密码
func NewServiceWithHash(username, hash, secret string, ttl time.Duration) (*Service, error) {
	if _, err := bcrypt.Cost([]byte(hash)); err != nil {
		return nil, ErrCredentials
	}
	return &Service{username: username, hash: []byte(hash), secret: []byte(secret), ttl: ttl}, nil
}

// Login 按一分钟窗口限制尝试次数，验证密码后签发含过期时间的管理员 JWT
func (s *Service) Login(username, password string) (string, time.Time, error) {
	// 登录尝试计数只在锁内更新，耗时密码验证不占用该锁
	s.mu.Lock()
	now := time.Now().UTC()
	if now.Sub(s.window) >= time.Minute {
		s.window = now
		s.attempts = 0
	}
	s.attempts++
	blocked := s.attempts > 10
	s.mu.Unlock()
	if blocked {
		return "", time.Time{}, ErrLoginRateLimit
	}
	valid := bcrypt.CompareHashAndPassword(s.hash, []byte(password)) == nil
	if username != s.username || !valid {
		return "", time.Time{}, ErrCredentials
	}
	// 令牌携带明确的签发者和受众，防止跨用途使用
	expiry := now.Add(s.ttl)
	claims := jwt.RegisteredClaims{
		Issuer:    "fluxvault-admin",
		Subject:   s.username,
		Audience:  jwt.ClaimStrings{"fluxvault-console"},
		ExpiresAt: jwt.NewNumericDate(expiry),
		IssuedAt:  jwt.NewNumericDate(now),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
	return token, expiry, err
}

// Verify 仅接受 HS256 和指定签发者、受众、管理员主题及有效过期时间
func (s *Service) Verify(raw string) error {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(
		raw,
		claims,
		func(_ *jwt.Token) (any, error) {
			return s.secret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer("fluxvault-admin"),
		jwt.WithAudience("fluxvault-console"),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid || claims.Subject != s.username {
		return ErrAdminSession
	}
	return nil
}
