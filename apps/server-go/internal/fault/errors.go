// 模块错误定义：集中保存稳定错误类别和安全说明

package fault

import "errors"

var (
	// ErrInvalidRequest 表示请求无效
	ErrInvalidRequest = errors.New("请求无效")
	// ErrUnauthorized 表示认证失败
	ErrUnauthorized = errors.New("认证失败")
	// ErrForbidden 表示权限不足
	ErrForbidden = errors.New("权限不足")
	// ErrNotFound 表示资源不存在
	ErrNotFound = errors.New("资源不存在")
	// ErrConflict 表示状态冲突
	ErrConflict = errors.New("状态冲突")
	// ErrPayloadTooLarge 表示正文超过上限
	ErrPayloadTooLarge = errors.New("正文超过上限")
	// ErrRateLimited 表示请求频率超过限制
	ErrRateLimited = errors.New("请求频率超过限制")
	// ErrStorageFailure 表示对象存储失败
	ErrStorageFailure = errors.New("对象存储失败")
	// ErrMetadataFailure 表示元数据操作失败
	ErrMetadataFailure = errors.New("元数据操作失败")
	// ErrCapacityExceeded 表示容量不足
	ErrCapacityExceeded = errors.New("容量不足")
	// ErrDirectUnavailable 表示直链不可用
	ErrDirectUnavailable = errors.New("直链不可用")
)

var categories = map[string]error{
	"invalid_request":    ErrInvalidRequest,
	"unauthorized":       ErrUnauthorized,
	"forbidden":          ErrForbidden,
	"not_found":          ErrNotFound,
	"conflict":           ErrConflict,
	"payload_too_large":  ErrPayloadTooLarge,
	"rate_limited":       ErrRateLimited,
	"storage_failure":    ErrStorageFailure,
	"metadata_failure":   ErrMetadataFailure,
	"capacity_exceeded":  ErrCapacityExceeded,
	"direct_unavailable": ErrDirectUnavailable,
}
