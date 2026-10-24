// 模块错误定义：集中保存稳定错误类别和安全说明

package config

import "errors"

var (
	// ErrUnsupportedMode 表示运行模式仅支持 mock 或 d1
	ErrUnsupportedMode = errors.New("运行模式仅支持 mock 或 d1")
	// ErrLoopbackAddress 表示监听地址必须为回环 IP
	ErrLoopbackAddress = errors.New("监听地址必须为回环 IP")
	// ErrInvalidSettings 表示需要 12 至 72 字节的初始化管理员密码、至少 32 字节 JWT 密钥、1 至 24 小时有效期及独立端口
	ErrInvalidSettings = errors.New("需要 12 至 72 字节的初始化管理员密码、至少 32 字节 JWT 密钥、1 至 24 小时有效期及独立端口")
)
