// 管理员登录接口：请求校验及 JWT 响应

package auth

import (
	"time"

	"fluxvault/server-go/internal/httpx"

	"github.com/gin-gonic/gin"
)

// Handler 将管理员登录请求适配为认证服务调用
type Handler struct{ service *Service }

// NewHandler 注入管理员认证服务
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// Login 验证管理员凭据并返回 JWT 及到期时间
// POST /admin/v1/auth/login
func (h *Handler) Login(c *gin.Context) {
	var input loginRequest
	if !httpx.Decode(c, &input) {
		return
	}
	if len(input.Username) < 1 || len(input.Username) > 120 || len(input.Password) < 1 || len(input.Password) > 72 {
		httpx.Error(c, ErrLoginInput)
		return
	}
	token, expiry, err := h.service.Login(input.Username, input.Password)
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(200, loginResponse{AccessToken: token, TokenType: "Bearer", ExpiresAt: expiry})
}
