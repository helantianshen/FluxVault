// 服务运行信息：进程健康和当前 mock 能力

package server

import "github.com/gin-gonic/gin"

// system 返回当前 mock 运行能力，不代表真实 Provider 已启用
func system(c *gin.Context) {
	c.JSON(200, gin.H{
		"mode": "mock", "backend": "go", "version": "0.1.0",
		"max_file_bytes": 8388608, "max_total_bytes": 33554432,
		"database": "memory", "real_providers": false,
	})
}

func health(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok", "mode": "mock", "backend": "go"})
}
