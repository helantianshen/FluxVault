// 服务运行信息：按实际组装模式返回数据库与对象存储能力

package server

import "github.com/gin-gonic/gin"

func system(mode string) gin.HandlerFunc {
	if mode != "d1" {
		mode = "mock"
	}
	return func(c *gin.Context) {
		database := "memory"
		var total any = 33554432
		real := mode == "d1"
		if real {
			database = "d1"
			total = nil
		}
		c.JSON(200, gin.H{"mode": mode, "backend": "go", "version": "0.1.0", "max_file_bytes": 8388608, "max_total_bytes": total, "database": database, "real_providers": real})
	}
}
func health(mode string) gin.HandlerFunc {
	if mode == "" {
		mode = "mock"
	}
	return func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok", "mode": mode, "backend": "go"}) }
}
