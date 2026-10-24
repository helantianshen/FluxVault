// 模块错误定义：集中保存稳定错误类别和安全说明

// Package file 定义文件模型和访问状态规则
package file

import "fluxvault/server-go/internal/fault"

var (
	// ErrFileName 表示文件名必须为 1 至 255 字节且不能包含路径或控制字符
	ErrFileName = fault.New("invalid_request", "文件名必须为 1 至 255 字节且不能包含路径或控制字符")
	// ErrNotReady 表示文件尚不可下载
	ErrNotReady = fault.New("conflict", "文件尚不可下载")
)

var (
	// ErrUploadScope 表示需要 upload 权限
	ErrUploadScope = fault.New("forbidden", "需要 upload 权限")
	// ErrVisibility 表示可见性无效
	ErrVisibility = fault.New("invalid_request", "可见性无效")
	// ErrReadScope 表示需要 read 权限
	ErrReadScope = fault.New("forbidden", "需要 read 权限")
	// ErrDirectUnavailable 表示mock 存储不提供安全直链，请使用 auto 或 proxy
	ErrDirectUnavailable = fault.New("direct_unavailable", "mock 存储不提供安全直链，请使用 auto 或 proxy")
	// ErrFileExists 表示文件已存在
	ErrFileExists = fault.New("conflict", "文件已存在")
	// ErrNotPending 表示只有待完成文件可以确认上传
	ErrNotPending = fault.New("conflict", "只有待完成文件可以确认上传")
	// ErrPendingDelete 表示待完成文件需先排查远端状态
	ErrPendingDelete = fault.New("conflict", "待完成文件需先排查远端状态")
	// ErrNotDeleting 表示文件尚未进入删除状态
	ErrNotDeleting = fault.New("conflict", "文件尚未进入删除状态")
	// ErrFilter 表示筛选条件无效
	ErrFilter = fault.New("invalid_request", "筛选条件无效")
	// ErrPagination 表示分页参数无效
	ErrPagination = fault.New("invalid_request", "分页参数无效")
	// ErrContentType 表示必须提供有效 Content-Type
	ErrContentType = fault.New("invalid_request", "必须提供有效 Content-Type")
	// ErrDownloadMode 表示下载模式无效
	ErrDownloadMode = fault.New("invalid_request", "下载模式无效")
)
