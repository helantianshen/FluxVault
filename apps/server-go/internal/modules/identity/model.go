// 身份模型：保存 API Key 和请求身份的数据

package identity

import "time"

// Principal 保存一次请求的管理员身份或 API Key 权限
type Principal struct {
	Admin  bool
	KeyID  string
	Scopes []string
}

// APIKey 保存密钥摘要和生命周期元数据，Hash 不进入 HTTP 响应
type APIKey struct {
	ID        string
	Name      string
	Hash      string
	Prefix    string
	Scopes    []string
	Status    string
	ExpiresAt *time.Time
	CreatedAt time.Time
}
