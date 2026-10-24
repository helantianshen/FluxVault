// 服务命令入口：解析配置位置并调用应用生命周期

// fluxvault-server 启动本地 Native 双 API 服务
package main

import (
	"flag"
	"log/slog"
	"os"

	"fluxvault/server-go/internal/app"
	"fluxvault/server-go/internal/config"
)

func run() error {
	path := flag.String("config", "", "YAML 配置路径")
	flag.Parse()
	c, err := config.Load(*path)
	if err != nil {
		return err
	}
	return app.Run(c)
}

func main() {
	if err := run(); err != nil {
		slog.Error("服务启动或运行失败", "error", err)
		os.Exit(1)
	}
}
