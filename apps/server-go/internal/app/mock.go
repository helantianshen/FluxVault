// 应用组装：显式构造 mock 仓储、业务服务、Handler 和路由

// Package app 组装应用依赖并管理启动、退出及资源释放
package app

import (
	"context"
	"time"

	"fluxvault/server-go/internal/config"
	"fluxvault/server-go/internal/infra/memory"
	"fluxvault/server-go/internal/middleware"
	"fluxvault/server-go/internal/modules/auth"
	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/identity"
	"fluxvault/server-go/internal/modules/storage"
	"fluxvault/server-go/internal/server"
)

// Mock 构造本地演示路由，失败时释放已创建的临时正文目录
func Mock(c config.Config) (server.Routes, func() error, error) {
	files, instances, keys := memory.NewRepositories()
	objects, err := memory.NewObjects()
	if err != nil {
		return server.Routes{}, nil, err
	}
	cleanup := objects.Close
	admin, err := auth.NewService(c.AdminUsername, c.AdminPassword, c.JWTSecret, c.JWTTTL)
	if err != nil {
		_ = cleanup()
		return server.Routes{}, nil, err
	}
	ctx := context.Background()
	now := time.Now().UTC()
	for _, instance := range []storage.Instance{
		{ID: "s3-main", Name: "对象存储", Provider: "s3", PrivateSupported: true, SecretRef: "S3_PRIMARY", Enabled: true, CreatedAt: now},
		{ID: "tg-archive", Name: "文件归档", Provider: "telegram", PrivateSupported: true, SecretRef: "TG_ARCHIVE", Enabled: true, CreatedAt: now},
		{ID: "gh-release", Name: "公开发行", Provider: "github", PrivateSupported: false, SecretRef: "GITHUB_RELEASE", Enabled: true, CreatedAt: now},
	} {
		if err = instances.CreateInstance(ctx, instance); err != nil {
			_ = cleanup()
			return server.Routes{}, nil, err
		}
	}
	storageService := storage.NewService(instances)
	fileService := file.NewService(files, storageService, objects)
	identityService := identity.NewService(keys)
	if err = seedFiles(ctx, fileService, files); err != nil {
		_ = cleanup()
		return server.Routes{}, nil, err
	}
	handlers := server.Handlers{
		Auth:      auth.NewHandler(admin),
		Files:     file.NewHandler(fileService),
		Instances: storage.NewHandler(storageService),
		Keys:      identity.NewHandler(identityService),
	}
	routes := server.NewRoutes(handlers, middleware.NewAuth(admin, identityService), c.AllowedOrigin)
	return routes, cleanup, nil
}
