// 模块错误定义：集中保存稳定错误类别和安全说明

package providers

import "fluxvault/server-go/internal/fault"

var (
	// ErrStorageFailure 表示远端存储请求失败或实例配置无效
	ErrStorageFailure = fault.New("storage_failure", "远端存储请求失败或实例配置无效")
	// ErrUploadTooLarge 表示SDK 代理上传单文件上限为 8 MiB
	ErrUploadTooLarge = fault.New("payload_too_large", "SDK 代理上传单文件上限为 8 MiB")
)
