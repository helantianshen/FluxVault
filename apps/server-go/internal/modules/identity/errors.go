// 模块错误定义：集中保存稳定错误类别和安全说明

// Package identity 定义请求身份、密钥模型及权限规则
package identity

import "fluxvault/server-go/internal/fault"

var (
	// ErrEmptyScopes 表示至少选择一项有效权限
	ErrEmptyScopes = fault.New("invalid_request", "至少选择一项有效权限")
	// ErrScopes 表示权限无效或重复
	ErrScopes = fault.New("invalid_request", "权限无效或重复")
	// ErrKeyStatus 表示密钥状态无效
	ErrKeyStatus = fault.New("invalid_request", "密钥状态无效")
	// ErrRevokedKey 表示已撤销的密钥不能恢复
	ErrRevokedKey = fault.New("conflict", "已撤销的密钥不能恢复")
)

var (
	// ErrKeyName 表示密钥名称无效
	ErrKeyName = fault.New("invalid_request", "密钥名称无效")
	// ErrExpiry 表示到期时间必须晚于当前时间
	ErrExpiry = fault.New("invalid_request", "到期时间必须晚于当前时间")
	// ErrInvalidKey 表示API Key 无效或已失效
	ErrInvalidKey = fault.New("unauthorized", "API Key 无效或已失效")
	// ErrRevokedRotation 表示已撤销的密钥不能轮换
	ErrRevokedRotation = fault.New("conflict", "已撤销的密钥不能轮换")
)
