// HTTP 协议层：JSON、查询参数与分页输入的协议校验

package httpx

import (
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
)

// Decode 限制 JSON 请求体为 16 KiB，拒绝未知字段和额外 JSON 值
func Decode(c *gin.Context, v any) bool {
	contentType, _, err := mime.ParseMediaType(c.GetHeader("Content-Type"))
	if err != nil || contentType != "application/json" {
		Error(c, ErrJSONContentType)
		return false
	}
	d := json.NewDecoder(http.MaxBytesReader(c.Writer, c.Request.Body, 16384))
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		Error(c, ErrJSONFields)
		return false
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		Error(c, ErrJSONTrailing)
		return false
	}
	return true
}

// ValidQuery 拒绝未声明或重复的查询参数，避免参数解释不一致
func ValidQuery(c *gin.Context, allowed ...string) bool {
	for key, values := range c.Request.URL.Query() {
		if !slices.Contains(allowed, key) || len(values) != 1 {
			Error(c, ErrQuery)
			return false
		}
	}
	return true
}
