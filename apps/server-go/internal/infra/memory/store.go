// 内存元数据基础设施：声明共享锁和各实体的数据容器

package memory

import (
	"sync"

	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/identity"
	"fluxvault/server-go/internal/modules/storage"
)

type store struct {
	mu        sync.RWMutex
	files     map[string]file.File
	instances map[string]storage.Instance
	keys      map[string]identity.APIKey
}

// NewRepositories 以同一把锁构造各模块仓储，保证创建文件与删除实例互斥
// 私有实现放在适配层，避免模块接口反向依赖适配器产生导入环
func NewRepositories() (file.Repository, storage.Repository, identity.Repository) {
	data := &store{files: map[string]file.File{}, instances: map[string]storage.Instance{}, keys: map[string]identity.APIKey{}}
	return &fileRepository{store: data}, &instanceRepository{store: data}, &keyRepository{store: data}
}
