// 管理员持久化接口：单管理员初始化及已保存摘要读取

package auth

import "context"

// Administrator 保存唯一管理员的登录名和 bcrypt 摘要
type Administrator struct {
	Username     string `json:"username"`
	PasswordHash string `json:"password_hash"`
}

// Repository 定义持久化管理员读取与只初始化一次的写入
type Repository interface {
	FindAdministrator(context.Context) (Administrator, error)
	InitializeAdministrator(context.Context, Administrator) (Administrator, error)
}
