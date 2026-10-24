// 文件仓储：参数化筛选、原子实例检查和条件状态转换

package d1

import (
	"context"
	"encoding/json"
	"errors"
	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/storage"
	"strings"
)

type fileRepository struct {
	*client
}

type fileRow struct {
	file.File
	LocatorJSON *string
}

const fileColumns = `id AS ID,name AS Name,content_type AS ContentType,size AS Size,instance_id AS InstanceID,COALESCE(owner_key_id,'system') AS OwnerID,visibility AS Visibility,state AS State,locator_json AS LocatorJSON,last_error AS LastError,created_at AS CreatedAt,updated_at AS UpdatedAt`

func decodeFile(r fileRow) (file.File, error) {
	if r.LocatorJSON != nil {
		var loc struct {
			ObjectKey string `json:"objectKey"`
		}
		if json.Unmarshal([]byte(*r.LocatorJSON), &loc) != nil || loc.ObjectKey == "" {
			return file.File{}, failure()
		}
		r.File.Locator.ObjectKey = loc.ObjectKey
	}
	return r.File, nil
}

// CreateFile 在同一 SQL 中复核实例存在、启用和私有能力后写入 pending
func (r *fileRepository) CreateFile(ctx context.Context, f file.File) error {
	var owner any = f.OwnerID
	kind := "api_key"
	if f.OwnerID == "system" {
		owner = nil
		kind = "system"
	}
	data, err := query[fileRow](ctx, r.client, `INSERT INTO files(id,name,name_search,content_type,size,instance_id,owner_key_id,owner_kind,visibility,state,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? FROM storage_instances WHERE id=? AND enabled=1 AND (? <> 'private' OR (private_supported=1 AND provider <> 'github')) ON CONFLICT(id) DO NOTHING RETURNING `+fileColumns, f.ID, f.Name, strings.ToLower(f.Name), f.ContentType, f.Size, f.InstanceID, owner, kind, f.Visibility, f.State, timestamp(f.CreatedAt), timestamp(f.UpdatedAt), f.InstanceID, f.Visibility)
	if err != nil {
		return err
	}
	if len(data) > 0 {
		return nil
	}
	i, err := (&instanceRepository{r.client}).FindInstance(ctx, f.InstanceID)
	if err != nil {
		return err
	}
	if err = i.Accept(f.Visibility); err != nil {
		return err
	}
	return file.ErrFileExists
}

// FindFile 按标识读取元数据和内部定位
func (r *fileRepository) FindFile(ctx context.Context, id string) (file.File, error) {
	data, err := query[fileRow](ctx, r.client, "SELECT "+fileColumns+" FROM files WHERE id=?", id)
	if err != nil {
		return file.File{}, err
	}
	if len(data) == 0 {
		return file.File{}, fault.NotFound()
	}
	return decodeFile(data[0])
}

// ListFiles 在同一批事务快照中获取总数和当前页，字面匹配名称避免通配符改变语义
func (r *fileRepository) ListFiles(ctx context.Context, f file.Filter) (file.Page, error) {
	clauses := []string{"instr(name_search,?) > 0"}
	params := []any{strings.ToLower(f.Query)}
	for _, part := range []struct{ column, value string }{{"state", f.State}, {"visibility", f.Visibility}, {"instance_id", f.InstanceID}} {
		if part.value != "" {
			clauses = append(clauses, part.column+"=?")
			params = append(params, part.value)
		}
	}
	if f.OwnerID != "" {
		clauses = append(clauses, "COALESCE(owner_key_id,'system')=?")
		params = append(params, f.OwnerID)
	}
	where := " FROM files WHERE " + strings.Join(clauses, " AND ")
	paged := append(append([]any{}, params...), f.Limit, f.Offset)
	results, err := r.execute(ctx, statement{"SELECT count(*) AS Total" + where, params}, statement{"SELECT " + fileColumns + where + " ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?", paged})
	if err != nil {
		return file.Page{}, err
	}
	count, err := rows[struct{ Total int }](results[0])
	if err != nil || len(count) != 1 {
		return file.Page{}, failure()
	}
	data, err := rows[fileRow](results[1])
	if err != nil {
		return file.Page{}, err
	}
	page := file.Page{Items: []file.File{}, Total: count[0].Total, Limit: f.Limit, Offset: f.Offset}
	for _, row := range data {
		value, err := decodeFile(row)
		if err != nil {
			return file.Page{}, err
		}
		page.Items = append(page.Items, value)
	}
	return page, nil
}

// CompleteFile 只允许 pending 原子进入 ready
func (r *fileRepository) CompleteFile(ctx context.Context, id string, loc storage.Locator, size int64) (file.File, error) {
	encoded, err := json.Marshal(map[string]string{"objectKey": loc.ObjectKey})
	if err != nil {
		return file.File{}, failure()
	}
	return r.transition(ctx, id, file.ErrNotPending, `UPDATE files SET locator_json=?,size=?,state='ready',last_error='',updated_at=? WHERE id=? AND state='pending' RETURNING `+fileColumns, string(encoded), size, now(), id)
}
func (r *fileRepository) transition(ctx context.Context, id string, conflict error, sql string, params ...any) (file.File, error) {
	data, err := query[fileRow](ctx, r.client, sql, params...)
	if err != nil {
		return file.File{}, err
	}
	if len(data) > 0 {
		return decodeFile(data[0])
	}
	if _, err = r.FindFile(ctx, id); err != nil {
		return file.File{}, err
	}
	return file.File{}, conflict
}

// RecordFailure 仅保存错误代码，不改变并发状态转换的结果
func (r *fileRepository) RecordFailure(ctx context.Context, id, code string) error {
	data, err := query[fileRow](ctx, r.client, "UPDATE files SET last_error=?,updated_at=? WHERE id=? RETURNING "+fileColumns, code, now(), id)
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return fault.NotFound()
	}
	return nil
}

// BeginDelete 拒绝 pending，已进入 deleting 的记录允许重试
func (r *fileRepository) BeginDelete(ctx context.Context, id string) (file.File, error) {
	return r.transition(ctx, id, file.ErrPendingDelete, "UPDATE files SET state='deleting',updated_at=? WHERE id=? AND state IN ('ready','deleting') RETURNING "+fileColumns, now(), id)
}

// RemoveFile 只移除 deleting 记录，已不存在时保持幂等
func (r *fileRepository) RemoveFile(ctx context.Context, id string) error {
	data, err := query[fileRow](ctx, r.client, "DELETE FROM files WHERE id=? AND state='deleting' RETURNING "+fileColumns, id)
	if err != nil {
		return err
	}
	if len(data) > 0 {
		return nil
	}
	_, err = r.FindFile(ctx, id)
	if errors.Is(err, fault.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	return file.ErrNotDeleting
}
