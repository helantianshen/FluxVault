// 认证中间件：校验管理员 JWT 或 API Key，并为请求设置身份

// Package middleware 提供认证、安全响应头和跨域请求策略
package middleware

import (
	"strings"

	"fluxvault/server-go/internal/httpx"
	"fluxvault/server-go/internal/modules/auth"
	"fluxvault/server-go/internal/modules/identity"

	"github.com/gin-gonic/gin"
)

// Auth 连接管理员和 API Key 认证服务
type Auth struct {
	admin *auth.Service
	keys  *identity.Service
}

// NewAuth 注入两种认证服务，分别用于独立的路由认证链
func NewAuth(admin *auth.Service, keys *identity.Service) *Auth {
	return &Auth{admin: admin, keys: keys}
}

// Admin 校验管理员 JWT，成功后写入管理员身份
func (a *Auth) Admin(c *gin.Context) {
	if err := a.admin.Verify(bearer(c)); err != nil {
		httpx.Error(c, err)
		return
	}
	c.Set("principal", identity.Principal{Admin: true})
	c.Next()
}

// Key 校验 API Key，并写入带 scope 的请求身份
func (a *Auth) Key(c *gin.Context) {
	p, err := a.keys.Authenticate(c.Request.Context(), bearer(c))
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.Set("principal", p)
	c.Next()
}

// OptionalKey 允许匿名下载；显式提供的凭据必须认证成功
func (a *Auth) OptionalKey(c *gin.Context) {
	if c.GetHeader("Authorization") == "" {
		c.Next()
		return
	}
	a.Key(c)
}

func bearer(c *gin.Context) string {
	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

// Principal 读取认证中间件设置的身份，未认证的请求使用匿名身份
func Principal(c *gin.Context) identity.Principal {
	value, ok := c.Get("principal")
	if !ok {
		return identity.Principal{}
	}
	return value.(identity.Principal)
}
