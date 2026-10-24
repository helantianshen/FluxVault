// 领域错误模型：保存安全说明、协议代码及关联文件标识

// Package fault 定义可公开的业务错误与稳定错误类别
package fault

// Error 保留既有契约的安全错误码、说明和可选关联文件标识
type Error struct {
	Code    string
	Message string
	FileID  string
}

// Error 返回可向客户端公开的安全错误说明
func (e *Error) Error() string {
	return e.Message
}

// New 构造包含协议代码与安全说明的领域错误
func New(code, message string) *Error {
	return &Error{
		Code:    code,
		Message: message,
	}
}

// NotFound 构造统一的不存在错误，避免泄露无权限资源的存在性
func NotFound() error {
	return New("not_found", "资源不存在")
}

// Unwrap 提供稳定错误类别，使包装后的业务错误仍可通过 errors.Is 识别
func (e *Error) Unwrap() error {
	return categories[e.Code]
}
