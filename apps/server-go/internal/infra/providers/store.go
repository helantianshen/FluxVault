// 存储适配入口：分发真实 SDK 操作并隔离凭据和远端错误

package providers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/storage"
)

// Store 按实例配置分派 SDK 操作，并隐藏远端凭据和错误详情
type Store struct {
	secrets SecretResolver
	http    *http.Client
}

var _ file.ObjectStore = (*Store)(nil)

// New 复制 HTTP 客户端并禁用自动重定向，默认请求超时两分钟
func New(secrets SecretResolver, client *http.Client) *Store {
	c := http.Client{Timeout: 2 * time.Minute}
	if client != nil {
		c = *client
		if c.Timeout == 0 {
			c.Timeout = 2 * time.Minute
		}
	}
	c.CheckRedirect = func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	}
	return &Store{secrets: secrets, http: &c}
}

// storageError 返回不包含远端 URL、签名或凭据的统一存储错误
func storageError() error {
	return ErrStorageFailure
}

// Upload 校验实例和对象标识，有界暂存后上传并返回带目标绑定的版本化定位符
func (s *Store) Upload(ctx context.Context, i storage.Instance, id string, body io.Reader) (storage.Locator, int64, error) {
	if !objectIDPattern.MatchString(id) {
		return storage.Locator{}, 0, storageError()
	}
	b, err := s.resolve(i)
	if err != nil {
		return storage.Locator{}, 0, storageError()
	}
	f, size, cleanup, err := spool(ctx, body)
	if err != nil {
		return storage.Locator{}, 0, err
	}
	defer cleanup()
	key, err := b.adapter.upload(ctx, id, f, size)
	if err != nil || key == "" {
		return storage.Locator{}, 0, storageError()
	}
	// 定位信息只绑定目标身份，不保存凭据或临时下载链接
	raw, _ := json.Marshal(remoteLocator{
		Version:  1,
		Provider: i.Provider,
		Instance: i.ID,
		Target:   b.target,
		Key:      key,
	})
	return storage.Locator{
		ObjectKey: string(raw),
	}, size, nil
}

// locate 校验定位符版本、实例、Provider 和目标绑定后返回远端键
func (s *Store) locate(i storage.Instance, l storage.Locator) (binding, string, error) {
	b, err := s.resolve(i)
	if err != nil {
		return binding{}, "", storageError()
	}
	var r remoteLocator
	if decodeConfig(l.ObjectKey, &r) != nil || r.Version != 1 || r.Instance != i.ID || r.Provider != i.Provider || r.Target != b.target || r.Key == "" {
		return binding{}, "", storageError()
	}
	return b, r.Key, nil
}

// Download 校验定位绑定后获取响应流，统一脱敏后续读取和关闭错误
func (s *Store) Download(ctx context.Context, i storage.Instance, l storage.Locator) (io.ReadCloser, error) {
	b, key, err := s.locate(i, l)
	if err != nil {
		return nil, err
	}
	body, err := b.adapter.download(ctx, key)
	if err != nil || body == nil {
		return nil, storageError()
	}
	return &safeBody{
		ReadCloser: body,
	}, nil
}

// Delete Telegram 直接成功，其他 Provider 校验绑定后执行远端删除
func (s *Store) Delete(ctx context.Context, i storage.Instance, l storage.Locator) error {
	if i.MetadataOnlyDelete() {
		return nil
	}
	b, key, err := s.locate(i, l)
	if err != nil {
		return err
	}
	if b.adapter.delete(ctx, key) != nil {
		return storageError()
	}
	return nil
}
