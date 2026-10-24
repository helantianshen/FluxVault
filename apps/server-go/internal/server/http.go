// HTTP 服务：Gin 安全默认值、超时和头部上限

package server

import (
	"errors"
	"net/http"
	"time"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/httpx"
	"fluxvault/server-go/internal/middleware"

	"github.com/gin-gonic/gin"
)

func router(allowedOrigin string) *gin.Engine {
	r := gin.New()
	_ = r.SetTrustedProxies(nil)
	r.Use(recovery(), middleware.Headers(allowedOrigin))
	r.NoRoute(func(c *gin.Context) { httpx.Error(c, fault.NotFound()) })
	return r
}

// recovery 保留 Gin 的异常恢复，并把下载中止信号交回 net/http 关闭连接或重置流
func recovery() gin.HandlerFunc {
	recoverPanic := gin.Recovery()
	return func(c *gin.Context) {
		recoverPanic(c)
		// Gin 1.12 将 ErrAbortHandler 记入 Errors 后吞掉，正常返回会使残缺下载成功结束
		for _, err := range c.Errors {
			if errors.Is(err.Err, http.ErrAbortHandler) {
				panic(http.ErrAbortHandler)
			}
		}
	}
}

// NewServers 为公开和管理入口设置相同的超时与请求头上限
func NewServers(routes Routes) []*http.Server {
	servers := make([]*http.Server, 0, 2)
	for _, handler := range []http.Handler{routes.Public, routes.Admin} {
		servers = append(servers, &http.Server{
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       2 * time.Minute,
			WriteTimeout:      2 * time.Minute,
			IdleTimeout:       60 * time.Second,
			MaxHeaderBytes:    16384,
		})
	}
	return servers
}
