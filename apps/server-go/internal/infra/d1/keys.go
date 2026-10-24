// 密钥仓储：持久化摘要、权限与不可恢复的撤销状态

package d1

import (
	"context"
	"encoding/json"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/identity"
)

type keyRepository struct{ *client }
type keyRow struct {
	identity.APIKey
	ScopesJSON string
}

const keyColumns = `id AS ID,name AS Name,secret_hash AS Hash,prefix AS Prefix,scopes AS ScopesJSON,status AS Status,expires_at AS ExpiresAt,created_at AS CreatedAt`

func decodeKey(r keyRow) (identity.APIKey, error) {
	if json.Unmarshal([]byte(r.ScopesJSON), &r.APIKey.Scopes) != nil {
		return identity.APIKey{}, failure()
	}
	return r.APIKey, nil
}

// ListKeys 返回摘要及权限元数据，HTTP 层继续使用安全 DTO
func (r *keyRepository) ListKeys(ctx context.Context) ([]identity.APIKey, error) {
	data, err := query[keyRow](ctx, r.client, "SELECT "+keyColumns+" FROM api_keys ORDER BY created_at DESC,id DESC")
	if err != nil {
		return nil, err
	}
	items := []identity.APIKey{}
	for _, row := range data {
		k, err := decodeKey(row)
		if err != nil {
			return nil, err
		}
		items = append(items, k)
	}
	return items, nil
}

// FindKeyByHash 查找精确摘要，不在仓储中放宽状态和有效期规则
func (r *keyRepository) FindKeyByHash(ctx context.Context, hash string) (identity.APIKey, error) {
	return r.find(ctx, "secret_hash", hash)
}
func (r *keyRepository) find(ctx context.Context, column, value string) (identity.APIKey, error) {
	data, err := query[keyRow](ctx, r.client, "SELECT "+keyColumns+" FROM api_keys WHERE "+column+"=?", value)
	if err != nil {
		return identity.APIKey{}, err
	}
	if len(data) == 0 {
		return identity.APIKey{}, fault.NotFound()
	}
	return decodeKey(data[0])
}

// CreateKey 保存摘要，永不保存密钥原文
func (r *keyRepository) CreateKey(ctx context.Context, k identity.APIKey) error {
	scopes, err := json.Marshal(k.Scopes)
	if err != nil {
		return failure()
	}
	var expiry any
	if k.ExpiresAt != nil {
		expiry = timestamp(*k.ExpiresAt)
	}
	_, err = query[keyRow](ctx, r.client, "INSERT INTO api_keys(id,name,secret_hash,prefix,scopes,status,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?) RETURNING "+keyColumns, k.ID, k.Name, k.Hash, k.Prefix, string(scopes), k.Status, expiry, timestamp(k.CreatedAt))
	return err
}

// SetKeyStatus 以条件更新保证 revoked 无法被并发恢复
func (r *keyRepository) SetKeyStatus(ctx context.Context, id, status string) (identity.APIKey, error) {
	if err := identity.ValidateStatus("enabled", status); err != nil {
		return identity.APIKey{}, err
	}
	data, err := query[keyRow](ctx, r.client, "UPDATE api_keys SET status=? WHERE id=? AND (status<>'revoked' OR ?='revoked') RETURNING "+keyColumns, status, id, status)
	if err != nil {
		return identity.APIKey{}, err
	}
	if len(data) > 0 {
		return decodeKey(data[0])
	}
	if _, err = r.find(ctx, "id", id); err != nil {
		return identity.APIKey{}, err
	}
	return identity.APIKey{}, identity.ErrRevokedKey
}

// RotateKey 原子替换摘要与前缀，已撤销密钥不能轮换
func (r *keyRepository) RotateKey(ctx context.Context, id, hash, prefix string) (identity.APIKey, error) {
	data, err := query[keyRow](ctx, r.client, "UPDATE api_keys SET secret_hash=?,prefix=? WHERE id=? AND status<>'revoked' RETURNING "+keyColumns, hash, prefix, id)
	if err != nil {
		return identity.APIKey{}, err
	}
	if len(data) > 0 {
		return decodeKey(data[0])
	}
	if _, err = r.find(ctx, "id", id); err != nil {
		return identity.APIKey{}, err
	}
	return identity.APIKey{}, identity.ErrRevokedRotation
}
