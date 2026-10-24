// 模块错误定义：集中保存稳定错误类别和安全说明

package auth

import "fluxvault/server-go/internal/fault"

var (
	// ErrLoginRateLimit 表示登录尝试过多，请一分钟后重试
	ErrLoginRateLimit = fault.New("rate_limited", "登录尝试过多，请一分钟后重试")
	// ErrCredentials 表示用户名或密码错误
	ErrCredentials = fault.New("unauthorized", "用户名或密码错误")
	// ErrAdminSession 表示管理员登录已失效
	ErrAdminSession = fault.New("unauthorized", "管理员登录已失效")
)

// ErrLoginInput 表示登录字段长度不符合协议要求
var ErrLoginInput = fault.New("invalid_request", "用户名或密码长度无效")
