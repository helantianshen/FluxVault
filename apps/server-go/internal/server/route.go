// HTTP 路由：集中注册独立的 Public 与 Admin 入口

// Package server 构造传输服务和完整路由，不组装业务依赖
package server

import (
	"net/http"

	"fluxvault/server-go/internal/middleware"
	"fluxvault/server-go/internal/modules/auth"
	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/identity"
	"fluxvault/server-go/internal/modules/storage"

	"github.com/gin-gonic/gin"
)

// Handlers 汇集各模块已完成注入的协议处理对象
type Handlers struct {
	Auth      *auth.Handler
	Files     *file.Handler
	Instances *storage.Handler
	Keys      *identity.Handler
	Mode      string
}

// Routes 保存独立的管理员和公开 API，避免两种认证链交叉注册
type Routes struct{ Public, Admin http.Handler }

// NewRoutes 一次构造两套监听入口，认证顺序在路由组处明确
func NewRoutes(h Handlers, authentication *middleware.Auth, allowedOrigin string) Routes {
	public := router(allowedOrigin)
	public.GET("/healthz", health(h.Mode))
	api := public.Group("/api/v1")
	api.GET("/files/:id/content", authentication.OptionalKey, h.Files.Download)
	api.Use(authentication.Key)
	api.GET("/files", h.Files.List)
	api.POST("/files", h.Files.Upload)
	api.GET("/files/:id", h.Files.Get)
	api.DELETE("/files/:id", h.Files.Delete)

	admin := router(allowedOrigin)
	admin.GET("/healthz", health(h.Mode))
	admin.POST("/admin/v1/auth/login", h.Auth.Login)
	management := admin.Group("/admin/v1", authentication.Admin)
	management.GET("/system", system(h.Mode))
	fileRoutes(management, h.Files)
	management.GET("/instances", h.Instances.List)
	management.POST("/instances", h.Instances.Create)
	management.PATCH("/instances/:id", h.Instances.Update)
	management.DELETE("/instances/:id", h.Instances.Delete)
	management.GET("/keys", h.Keys.List)
	management.POST("/keys", h.Keys.Create)
	management.PATCH("/keys/:id", h.Keys.Update)
	management.POST("/keys/:id/rotate", h.Keys.Rotate)
	return Routes{Public: public, Admin: admin}
}

func fileRoutes(group *gin.RouterGroup, handler *file.Handler) {
	group.GET("/files", handler.List)
	group.POST("/files", handler.Upload)
	group.GET("/files/:id", handler.Get)
	group.GET("/files/:id/content", handler.Download)
	group.DELETE("/files/:id", handler.Delete)
}
