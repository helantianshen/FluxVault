// 文件持久化接口：限定模块的数据读写能力

package file

import (
	"context"

	"fluxvault/server-go/internal/modules/storage"
)

// Repository 定义本模块持久化操作，由具体存储适配器实现
type Repository interface {
	CreateFile(context.Context, File) error
	FindFile(context.Context, string) (File, error)
	ListFiles(context.Context, Filter) (Page, error)
	CompleteFile(context.Context, string, storage.Locator, int64) (File, error)
	RecordFailure(context.Context, string, string) error
	BeginDelete(context.Context, string) (File, error)
	RemoveFile(context.Context, string) error
}
