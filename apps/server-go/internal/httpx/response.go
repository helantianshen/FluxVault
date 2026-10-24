// HTTP 响应：保留 OpenAPI 约定的错误对象和安全状态映射

// Package httpx 提供共享请求校验和安全错误响应，不依赖业务模块

package httpx

import (
	"errors"

	"fluxvault/server-go/internal/fault"

	"github.com/gin-gonic/gin"
)

// Error 提取安全领域错误并映射 HTTP 状态，未知错误统一隐藏内部详情
func Error(c *gin.Context, err error) {
	e := &fault.Error{Code: "internal_error", Message: "服务暂时不可用"}
	var known *fault.Error
	if errors.As(err, &known) {
		e = known
	}
	statuses := map[string]int{
		"invalid_request":    400,
		"unauthorized":       401,
		"forbidden":          403,
		"not_found":          404,
		"conflict":           409,
		"payload_too_large":  413,
		"rate_limited":       429,
		"storage_failure":    502,
		"metadata_failure":   503,
		"capacity_exceeded":  503,
		"direct_unavailable": 422,
	}
	status, ok := statuses[e.Code]
	if !ok {
		status = 500
	}
	detail := gin.H{"code": e.Code, "message": e.Message}
	if e.FileID != "" {
		detail["file_id"] = e.FileID
	}
	if status == 401 {
		c.Header("WWW-Authenticate", "Bearer")
	}
	if status == 429 {
		c.Header("Retry-After", "60")
	}
	c.AbortWithStatusJSON(status, gin.H{"error": detail})
}
