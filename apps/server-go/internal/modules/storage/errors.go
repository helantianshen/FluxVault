// 模块错误定义：集中保存稳定错误类别和安全说明

// Package storage 定义存储实例、定位数据及访问能力规则
package storage

import "fluxvault/server-go/internal/fault"

var (
	// ErrInstanceConfig 表示存储实例名称、类型或 Secret 引用无效
	ErrInstanceConfig = fault.New("invalid_request", "存储实例名称、类型或 Secret 引用无效")
	// ErrDisabledInstance 表示存储实例已禁用
	ErrDisabledInstance = fault.New("conflict", "存储实例已禁用")
	// ErrPrivateUnsupported 表示该实例不支持严格私有文件
	ErrPrivateUnsupported = fault.New("invalid_request", "该实例不支持严格私有文件")
)

var (
	// ErrEmptyUpdate 表示至少提供一个修改字段
	ErrEmptyUpdate = fault.New("invalid_request", "至少提供一个修改字段")
	// ErrInstanceName 表示实例名称无效
	ErrInstanceName = fault.New("invalid_request", "实例名称无效")
	// ErrInstanceExists 表示实例已存在
	ErrInstanceExists = fault.New("conflict", "实例已存在")
	// ErrInstanceInUse 表示实例仍有关联文件，不能删除
	ErrInstanceInUse = fault.New("conflict", "实例仍有关联文件，不能删除")
	// ErrPrivateCapability 表示必须明确实例的私有访问能力
	ErrPrivateCapability = fault.New("invalid_request", "必须明确实例的私有访问能力")
)
