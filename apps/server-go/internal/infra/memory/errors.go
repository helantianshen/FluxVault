// mock 正文存储错误：只暴露安全的容量和可用性提示

// Package memory 实现共享内存元数据和隔离临时正文存储
package memory

import "fluxvault/server-go/internal/fault"

var (
	// ErrCapacity 表示mock 对象空间不足
	ErrCapacity = fault.New("capacity_exceeded", "mock 对象空间不足")
	// ErrFileTooLarge 表示mock 单文件上限为 8 MiB
	ErrFileTooLarge = fault.New("payload_too_large", "mock 单文件上限为 8 MiB")
	// ErrContentUnavailable 表示远端内容不可用
	ErrContentUnavailable = fault.New("storage_failure", "远端内容不可用")
)
