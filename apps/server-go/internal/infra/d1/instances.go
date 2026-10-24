// 实例仓储：显式列更新和原子引用删除检查

package d1

import (
	"context"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/storage"
)

type instanceRepository struct{ *client }
type instanceRow struct {
	storage.Instance
	Enabled, PrivateSupported int
}

const instanceColumns = `id AS ID,name AS Name,provider AS Provider,secret_ref AS SecretRef,private_supported AS PrivateSupported,enabled AS Enabled,created_at AS CreatedAt`

func decodeInstance(r instanceRow) storage.Instance {
	r.Instance.Enabled = r.Enabled != 0
	r.Instance.PrivateSupported = r.PrivateSupported != 0
	return r.Instance
}
func bit(v bool) int {
	if v {
		return 1
	}
	return 0
}

// ListInstances 返回按标识排序的实例
func (r *instanceRepository) ListInstances(ctx context.Context) ([]storage.Instance, error) {
	data, err := query[instanceRow](ctx, r.client, "SELECT "+instanceColumns+" FROM storage_instances ORDER BY id")
	if err != nil {
		return nil, err
	}
	items := []storage.Instance{}
	for _, row := range data {
		items = append(items, decodeInstance(row))
	}
	return items, nil
}

// FindInstance 按标识读取配置，不返回 Secret 原文
func (r *instanceRepository) FindInstance(ctx context.Context, id string) (storage.Instance, error) {
	data, err := query[instanceRow](ctx, r.client, "SELECT "+instanceColumns+" FROM storage_instances WHERE id=?", id)
	if err != nil {
		return storage.Instance{}, err
	}
	if len(data) == 0 {
		return storage.Instance{}, fault.NotFound()
	}
	return decodeInstance(data[0]), nil
}

// CreateInstance 只插入新实例，不覆盖已有配置
func (r *instanceRepository) CreateInstance(ctx context.Context, i storage.Instance) error {
	data, err := query[instanceRow](ctx, r.client, "INSERT INTO storage_instances(id,name,provider,secret_ref,private_supported,enabled,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING "+instanceColumns, i.ID, i.Name, i.Provider, i.SecretRef, bit(i.PrivateSupported), bit(i.Enabled), timestamp(i.CreatedAt))
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return storage.ErrInstanceExists
	}
	return nil
}

// UpdateInstance 仅更新明确提供的名称与启用状态
func (r *instanceRepository) UpdateInstance(ctx context.Context, id string, name *string, enabled *bool) (storage.Instance, error) {
	var n, e any
	if name != nil {
		n = *name
	}
	if enabled != nil {
		e = bit(*enabled)
	}
	data, err := query[instanceRow](ctx, r.client, "UPDATE storage_instances SET name=COALESCE(?,name),enabled=COALESCE(?,enabled) WHERE id=? RETURNING "+instanceColumns, n, e, id)
	if err != nil {
		return storage.Instance{}, err
	}
	if len(data) == 0 {
		return storage.Instance{}, fault.NotFound()
	}
	return decodeInstance(data[0]), nil
}

// RemoveInstance 在单条语句中检查引用，外键同时阻止并发产生悬空文件
func (r *instanceRepository) RemoveInstance(ctx context.Context, id string) error {
	data, err := query[instanceRow](ctx, r.client, "DELETE FROM storage_instances WHERE id=? AND NOT EXISTS(SELECT 1 FROM files WHERE instance_id=?) RETURNING "+instanceColumns, id, id)
	if err != nil {
		return err
	}
	if len(data) > 0 {
		return nil
	}
	if _, err = r.FindInstance(ctx, id); err != nil {
		return err
	}
	return storage.ErrInstanceInUse
}
