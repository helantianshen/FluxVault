// HTTP 协议层：API Key 接口的请求解析和一次性凭据响应

package identity

import (
	"time"

	"fluxvault/server-go/internal/httpx"

	"github.com/gin-gonic/gin"
)

// Handler 将本模块 HTTP 请求适配为 Service 操作
type Handler struct{ service *Service }

// NewHandler 注入本模块业务服务，不向协议层暴露 Repository
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// KeyDTO 是本模块列表、详情及写入响应共用的安全视图
type KeyDTO struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Prefix    string     `json:"prefix"`
	Scopes    []string   `json:"scopes"`
	Status    string     `json:"status"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// keyDTO 映射密钥展示元数据，排除摘要和凭据原文
func keyDTO(k APIKey) KeyDTO {
	return KeyDTO{
		ID:        k.ID,
		Name:      k.Name,
		Prefix:    k.Prefix,
		Scopes:    k.Scopes,
		Status:    k.Status,
		ExpiresAt: k.ExpiresAt,
		CreatedAt: k.CreatedAt,
	}
}

type keyListResponse struct {
	Items []KeyDTO `json:"items"`
}

// List 返回不含密钥哈希的 API Key 列表
// GET /admin/v1/keys
func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		httpx.Error(c, err)
		return
	}
	result := []KeyDTO{}
	for _, k := range items {
		result = append(result, keyDTO(k))
	}
	c.JSON(200, keyListResponse{Items: result})
}

// CreateRequest 承载密钥名称、权限和可选到期时间
type CreateRequest struct {
	Name      string     `json:"name"`
	Scopes    []string   `json:"scopes"`
	ExpiresAt *time.Time `json:"expires_at"`
}

// issuedKeyResponse 供创建和轮换接口返回一次性密钥原文
type issuedKeyResponse struct {
	APIKey KeyDTO `json:"api_key"`
	Secret string `json:"secret"`
}

// Create 创建 API Key，并仅在本次响应提供密钥原文
// POST /admin/v1/keys
func (h *Handler) Create(c *gin.Context) {
	var input CreateRequest
	if !httpx.Decode(c, &input) {
		return
	}
	key, secret, err := h.service.Create(c.Request.Context(), CreateInput{Name: input.Name, Scopes: input.Scopes, ExpiresAt: input.ExpiresAt})
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(201, issuedKeyResponse{APIKey: keyDTO(key), Secret: secret})
}

// UpdateRequest 承载 API Key 的目标状态
type UpdateRequest struct {
	Status string `json:"status"`
}

// Update 更新密钥状态并返回展示元数据
// PATCH /admin/v1/keys/:id
func (h *Handler) Update(c *gin.Context) {
	var input UpdateRequest
	if !httpx.Decode(c, &input) {
		return
	}
	key, err := h.service.UpdateStatus(c.Request.Context(), c.Param("id"), input.Status)
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(200, keyDTO(key))
}

// Rotate 轮换指定密钥并仅在本次响应提供新原文
// POST /admin/v1/keys/:id/rotate
func (h *Handler) Rotate(c *gin.Context) {
	key, secret, err := h.service.Rotate(c.Request.Context(), c.Param("id"))
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(200, issuedKeyResponse{APIKey: keyDTO(key), Secret: secret})
}
