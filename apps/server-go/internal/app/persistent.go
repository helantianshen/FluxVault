// 持久化组装：D1 元数据、单管理员初始化与真实对象适配器

package app

import (
	"context"
	"errors"
	"time"

	"fluxvault/server-go/internal/config"
	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/infra/d1"
	"fluxvault/server-go/internal/middleware"
	"fluxvault/server-go/internal/modules/auth"
	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/identity"
	"fluxvault/server-go/internal/modules/storage"
	"fluxvault/server-go/internal/server"

	"golang.org/x/crypto/bcrypt"
)

// Persistent 只连接已迁移的数据库，不自动执行 DDL 或写入演示数据
func Persistent(c config.Config) (server.Routes, func() error, error) {
	files, instances, keys, administrators, err := d1.NewRepositories(c.D1AccountID, c.D1DatabaseID, c.D1APIToken)
	if err != nil {
		return server.Routes{}, nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	a, err := administrators.FindAdministrator(ctx)
	if errors.Is(err, fault.ErrNotFound) {
		if len(c.AdminPassword) < 12 || len(c.AdminPassword) > 72 {
			return server.Routes{}, nil, errors.New("数据库尚无管理员，请填写初始化密码")
		}
		hash, e := bcrypt.GenerateFromPassword([]byte(c.AdminPassword), 12)
		if e != nil {
			return server.Routes{}, nil, e
		}
		a, err = administrators.InitializeAdministrator(ctx, auth.Administrator{Username: c.AdminUsername, PasswordHash: string(hash)})
	}
	if err != nil {
		return server.Routes{}, nil, err
	}
	admin, err := auth.NewServiceWithHash(a.Username, a.PasswordHash, c.JWTSecret, c.JWTTTL)
	if err != nil {
		return server.Routes{}, nil, err
	}
	instanceService := storage.NewService(instances)
	keyService := identity.NewService(keys)
	handlers := server.Handlers{Mode: "d1", Auth: auth.NewHandler(admin), Files: file.NewHandler(file.NewService(files, instanceService, SDKObjects()), true), Instances: storage.NewHandler(instanceService), Keys: identity.NewHandler(keyService)}
	return server.NewRoutes(handlers, middleware.NewAuth(admin, keyService), c.AllowedOrigin), func() error { return nil }, nil
}
