// 存储模型：区分实例配置与远端对象定位

package storage

import "time"

// Instance 保存实例能力和 Secret 名称引用，不持有真实凭据
type Instance struct {
	ID               string
	Name             string
	Provider         string
	PrivateSupported bool
	SecretRef        string
	Enabled          bool
	CreatedAt        time.Time
}

// Locator 保存适配器使用的内部定位符，不向 HTTP 客户端公开
type Locator struct{ ObjectKey string }
