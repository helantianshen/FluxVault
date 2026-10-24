// HTTP 协议层：存储实例接口的请求解析和安全视图

package storage

import (
	"time"

	"fluxvault/server-go/internal/httpx"

	"github.com/gin-gonic/gin"
)

// Handler 将本模块 HTTP 请求适配为 Service 操作
type Handler struct{ service *Service }

// NewHandler 注入本模块业务服务，不向协议层暴露 Repository
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// InstanceDTO 是本模块列表、详情及写入响应共用的安全视图
type InstanceDTO struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Provider         string    `json:"provider"`
	PrivateSupported bool      `json:"private_supported"`
	SecretRef        string    `json:"secret_ref"`
	Enabled          bool      `json:"enabled"`
	CreatedAt        time.Time `json:"created_at"`
}

// instanceDTO 映射实例配置视图，仅公开 Secret 名称而非凭据
func instanceDTO(i Instance) InstanceDTO {
	return InstanceDTO{
		ID:               i.ID,
		Name:             i.Name,
		Provider:         i.Provider,
		PrivateSupported: i.PrivateSupported,
		SecretRef:        i.SecretRef,
		Enabled:          i.Enabled,
		CreatedAt:        i.CreatedAt,
	}
}

type instanceListResponse struct {
	Items []InstanceDTO `json:"items"`
}

// List 返回不含真实凭据的实例列表
// GET /admin/v1/instances
func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		httpx.Error(c, err)
		return
	}
	result := []InstanceDTO{}
	for _, i := range items {
		result = append(result, instanceDTO(i))
	}
	c.JSON(200, instanceListResponse{Items: result})
}

// CreateRequest 承载新实例配置，私有能力必须显式提供
type CreateRequest struct {
	Name             string `json:"name"`
	Provider         string `json:"provider"`
	SecretRef        string `json:"secret_ref"`
	PrivateSupported *bool  `json:"private_supported"`
}

// Create 解析并校验实例创建请求，调用业务服务保存配置
// POST /admin/v1/instances
func (h *Handler) Create(c *gin.Context) {
	var input CreateRequest
	if !httpx.Decode(c, &input) {
		return
	}
	if input.PrivateSupported == nil {
		httpx.Error(c, ErrPrivateCapability)
		return
	}
	i, err := h.service.Create(c.Request.Context(), CreateInput{Name: input.Name, Provider: input.Provider, SecretRef: input.SecretRef, PrivateSupported: *input.PrivateSupported})
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(201, instanceDTO(i))
}

// UpdateRequest 仅允许更新名称和启用状态，nil 表示未提供
type UpdateRequest struct {
	Name    *string `json:"name"`
	Enabled *bool   `json:"enabled"`
}

// Update 解析实例更新字段并返回更新后的安全视图
// PATCH /admin/v1/instances/:id
func (h *Handler) Update(c *gin.Context) {
	var input UpdateRequest
	if !httpx.Decode(c, &input) {
		return
	}
	i, err := h.service.Update(c.Request.Context(), c.Param("id"), input.Name, input.Enabled)
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(200, instanceDTO(i))
}

// Delete 删除未被引用的实例，成功返回无正文响应
// DELETE /admin/v1/instances/:id
func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		httpx.Error(c, err)
		return
	}
	c.Status(204)
}
