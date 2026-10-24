// 文件业务规则：约束名称、访问权限与可下载状态

package file

import (
	"strings"
	"unicode"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/identity"
)

// ValidateName 限制文件名的字节长度，拒绝空白、路径分隔符和控制字符
func ValidateName(name string) error {
	lengthInvalid := strings.TrimSpace(name) == "" || len(name) > 255
	containsPath := strings.ContainsAny(name, `/\`)
	containsControl := strings.IndexFunc(name, unicode.IsControl) >= 0
	if lengthInvalid || containsPath || containsControl {
		return ErrFileName
	}
	return nil
}

// CanRead 检查管理员、公开文件或具有读取 scope 的所有者是否可读
func (f File) CanRead(p identity.Principal) bool {
	return p.Admin || f.Visibility == "public" || (p.Has("read") && p.KeyID == f.OwnerID)
}

// CanDelete 只允许管理员或具有删除 scope 的所有者删除文件
func (f File) CanDelete(p identity.Principal) bool {
	return p.Admin || (p.Has("delete") && p.KeyID == f.OwnerID)
}

// Downloadable 先隐藏无权访问的资源，再拒绝尚未 ready 的文件
func (f File) Downloadable(p identity.Principal) error {
	if !f.CanRead(p) {
		return fault.NotFound()
	}
	if f.State != "ready" {
		return ErrNotReady
	}
	return nil
}
