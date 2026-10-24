// 管理员仓储：校验必要迁移，仅允许首次初始化写入摘要

package d1

import (
	"context"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/auth"
)

type adminRepository struct{ *client }

// FindAdministrator 检查文件搜索列已迁移后读取唯一管理员
func (r *adminRepository) FindAdministrator(ctx context.Context) (auth.Administrator, error) {
	unfilled, err := query[struct{ ID string }](ctx, r.client, "SELECT id FROM files WHERE name_search = '' LIMIT 1")
	if err != nil {
		return auth.Administrator{}, err
	}
	if len(unfilled) > 0 {
		return auth.Administrator{}, failure()
	}
	data, err := query[auth.Administrator](ctx, r.client, "SELECT username,password_hash FROM administrators WHERE id=1")
	if err != nil {
		return auth.Administrator{}, err
	}
	if len(data) == 0 {
		return auth.Administrator{}, fault.NotFound()
	}
	return data[0], nil
}

// InitializeAdministrator 在竞争初始化中保留先成功的管理员，绝不覆盖已有密码
func (r *adminRepository) InitializeAdministrator(ctx context.Context, a auth.Administrator) (auth.Administrator, error) {
	_, err := query[auth.Administrator](ctx, r.client, "INSERT INTO administrators(id,username,password_hash,created_at) VALUES(1,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING username,password_hash", a.Username, a.PasswordHash, now())
	if err != nil {
		return auth.Administrator{}, err
	}
	return r.FindAdministrator(ctx)
}
