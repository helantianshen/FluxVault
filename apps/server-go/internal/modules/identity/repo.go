// 身份密钥持久化接口：限定模块的数据读写能力

package identity

import (
	"context"
)

// Repository 定义本模块持久化操作，由具体存储适配器实现
type Repository interface {
	ListKeys(context.Context) ([]APIKey, error)
	FindKeyByHash(context.Context, string) (APIKey, error)
	CreateKey(context.Context, APIKey) error
	SetKeyStatus(context.Context, string, string) (APIKey, error)
	RotateKey(context.Context, string, string, string) (APIKey, error)
}
