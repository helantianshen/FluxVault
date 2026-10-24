// 文件模型：保存元数据、内部定位及分页查询结果

package file

import (
	"time"

	"fluxvault/server-go/internal/modules/storage"
	"fluxvault/server-go/pkg/pagination"
)

// File 保存文件元数据和内部对象定位，HTTP 输出必须使用安全视图
type File struct {
	ID          string
	Name        string
	ContentType string
	Size        int64
	InstanceID  string
	OwnerID     string
	Visibility  string
	State       string
	Locator     storage.Locator
	LastError   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Filter 限定文件筛选条件和分页范围，OwnerID 由业务服务收紧
type Filter struct {
	Query      string
	State      string
	Visibility string
	InstanceID string
	OwnerID    string
	pagination.Params
}

// Page 携带文件列表与分页元数据
type Page = pagination.Page[File]
