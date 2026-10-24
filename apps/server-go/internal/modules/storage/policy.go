// 存储业务规则：校验实例配置、上传能力及删除策略

package storage

import (
	"regexp"
	"slices"
	"strings"
)

var secretPattern = regexp.MustCompile(`^[A-Z][A-Z0-9_]{0,63}$`)

// Validate 校验实例名称、Provider 取值及环境 Secret 引用格式
func (i Instance) Validate() error {
	nameInvalid := strings.TrimSpace(i.Name) == "" || len(i.Name) > 120
	providerInvalid := !slices.Contains([]string{"s3", "telegram", "github"}, i.Provider)
	secretRefInvalid := !secretPattern.MatchString(i.SecretRef)
	if nameInvalid || providerInvalid || secretRefInvalid {
		return ErrInstanceConfig
	}
	return nil
}

// Accept 拒绝向停用实例上传，并检查私有文件所需的实例能力
func (i Instance) Accept(visibility string) error {
	if !i.Enabled {
		return ErrDisabledInstance
	}
	if visibility == "private" && !i.PrivateSupported {
		return ErrPrivateUnsupported
	}
	return nil
}

// MetadataOnlyDelete 标识 Telegram 仅删除元数据而保留远端内容的语义
func (i Instance) MetadataOnlyDelete() bool { return i.Provider == "telegram" }
