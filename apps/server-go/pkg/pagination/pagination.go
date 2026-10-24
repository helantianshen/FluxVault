// 分页模型：统一默认值、范围校验及泛型分页结果

// Package pagination 提供不依赖 HTTP 或实体模型的分页约束
package pagination

const (
	// DefaultLimit 是未提供页大小时采用的条数
	DefaultLimit = 50 // 默认每页条数，查询未提供 limit 时使用
	// MaxLimit 是允许请求的最大每页条数
	MaxLimit = 100 // 每页最多条数，超过时拒绝查询
	// MaxOffset 是允许请求的最大起始偏移量
	MaxOffset = 100000 // 最大起始偏移量，超过时拒绝查询
)

// Params 保存页大小和从零开始的记录偏移量
type Params struct{ Limit, Offset int }

// Page 携带当前页记录、总数及分页参数
type Page[T any] struct {
	Items  []T
	Total  int
	Limit  int
	Offset int
}

// Default 返回从首条记录开始的默认分页参数
func Default() Params { return Params{Limit: DefaultLimit} }

// Validate 拒绝无效页大小和偏移量，不静默截断调用方输入
func (p Params) Validate() error {
	if p.Limit < 1 || p.Limit > MaxLimit || p.Offset < 0 || p.Offset > MaxOffset {
		return ErrInvalidParams
	}
	return nil
}

// Bounds 为已校验参数计算集合切片边界，偏移超过总量时返回空区间
func (p Params) Bounds(total int) (int, int) {
	start := min(p.Offset, total)
	return start, min(start+p.Limit, total)
}
