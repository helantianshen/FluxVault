// 存储适配基础设施：声明内部适配端口与版本化定位数据

package providers

import (
	"context"
	"io"
	"os"
)

// MaxUploadBytes 限制代理上传暂存的字节数，超限不访问 Provider
const MaxUploadBytes int64 = 8 << 20 // SDK 代理上传上限，单位为字节，超过时不访问 Provider

// SecretResolver 按名称读取运行配置，找不到时返回 false
type SecretResolver func(string) (string, bool)

type remoteLocator struct {
	Version  int    `json:"v"`
	Provider string `json:"provider"`
	Instance string `json:"instance"`
	Target   string `json:"target"`
	Key      string `json:"key"`
}

type adapter interface {
	upload(context.Context, string, *os.File, int64) (string, error)
	download(context.Context, string) (io.ReadCloser, error)
	delete(context.Context, string) error
}

type binding struct {
	adapter adapter
	target  string
}
