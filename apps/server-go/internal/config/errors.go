// 模块错误定义：集中保存稳定错误类别和安全说明

package config

import "errors"

var (
	// ErrUnsupportedMode 表示当前启动入口仅支持 mock，真实存储运行入口未启用
	ErrUnsupportedMode = errors.New("当前启动入口仅支持 mock，真实存储运行入口未启用")
	// ErrLoopbackAddress 表示mock 监听地址必须为回环 IP
	ErrLoopbackAddress = errors.New("mock 监听地址必须为回环 IP")
	// ErrInvalidSettings 表示需要 12 至 72 字节的 mock 管理员密码、至少 32 字节 JWT 密钥、1 至 24 小时有效期及独立端口
	ErrInvalidSettings = errors.New("需要 12 至 72 字节的 mock 管理员密码、至少 32 字节 JWT 密钥、1 至 24 小时有效期及独立端口")
)
