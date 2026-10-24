// 请求校验错误：只保存通用协议错误

package httpx

import "fluxvault/server-go/internal/fault"

var (
	// ErrJSONContentType 表示请求体必须为 JSON
	ErrJSONContentType = fault.New("invalid_request", "请求体必须为 JSON")
	// ErrJSONFields 表示JSON 字段或类型无效
	ErrJSONFields = fault.New("invalid_request", "JSON 字段或类型无效")
	// ErrJSONTrailing 表示请求体只能包含一个 JSON 对象
	ErrJSONTrailing = fault.New("invalid_request", "请求体只能包含一个 JSON 对象")
	// ErrQuery 表示查询参数无效或重复
	ErrQuery = fault.New("invalid_request", "查询参数无效或重复")
)
