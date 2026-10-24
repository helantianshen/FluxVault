// 分页错误：表示调用方提供的页大小或偏移量不在允许范围内

package pagination

import "errors"

// ErrInvalidParams 表示页大小或偏移量超出允许范围
var ErrInvalidParams = errors.New("分页参数无效")
