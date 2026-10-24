// 存储实例持久化接口：限定模块的数据读写能力

package storage

import (
	"context"
)

// Repository 定义本模块持久化操作，由具体存储适配器实现
type Repository interface {
	ListInstances(context.Context) ([]Instance, error)
	FindInstance(context.Context, string) (Instance, error)
	CreateInstance(context.Context, Instance) error
	UpdateInstance(context.Context, string, *string, *bool) (Instance, error)
	RemoveInstance(context.Context, string) error
}
