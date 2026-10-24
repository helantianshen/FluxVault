// 身份业务规则：检查权限、到期和撤销终态

package identity

import (
	"slices"
	"time"
)

// Has 检查管理员身份或已认证密钥是否具有指定 scope
func (p Principal) Has(scope string) bool {
	return p.Admin || (p.KeyID != "" && slices.Contains(p.Scopes, scope))
}

// Owner 为管理员返回系统归属，为 API Key 返回其自身标识
func (p Principal) Owner() string {
	if p.Admin {
		return "system"
	}
	return p.KeyID
}

// Active 要求密钥处于 enabled 且尚未到期，到期时刻即失效
func (k APIKey) Active(now time.Time) bool {
	return k.Status == "enabled" && (k.ExpiresAt == nil || k.ExpiresAt.After(now))
}

// ValidateScopes 要求一至三个不重复的合法文件操作权限
func ValidateScopes(scopes []string) error {
	if len(scopes) == 0 || len(scopes) > 3 {
		return ErrEmptyScopes
	}
	seen := map[string]bool{}
	for _, scope := range scopes {
		if !slices.Contains([]string{"upload", "read", "delete"}, scope) || seen[scope] {
			return ErrScopes
		}
		seen[scope] = true
	}
	return nil
}

// ValidateStatus 校验状态取值，并保证 revoked 是不可恢复的终态
func ValidateStatus(current, next string) error {
	if !slices.Contains([]string{"enabled", "disabled", "revoked"}, next) {
		return ErrKeyStatus
	}
	if current == "revoked" && next != "revoked" {
		return ErrRevokedKey
	}
	return nil
}
