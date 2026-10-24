// 本地正文存储：管理临时文件、有界容量与资源释放

package memory

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"sync"

	"fluxvault/server-go/internal/modules/storage"
)

// MaxFileBytes 限制单个 mock 正文的字节数
const MaxFileBytes int64 = 8 << 20 // 单文件正文上限，单位为字节，超过时拒绝上传
// MaxTotalBytes 限制单次 mock 运行可占用的正文总字节数
const MaxTotalBytes int64 = 32 << 20 // mock 正文总容量，单位为字节，无法预留单文件上限时拒绝上传

// Objects 管理单次 mock 运行的临时正文目录和容量账本
type Objects struct {
	mu    sync.Mutex
	dir   string
	used  int64
	sizes map[string]int64
}

// NewObjects 为当前 mock 运行创建专用临时目录和容量账本
func NewObjects() (*Objects, error) {
	dir, err := os.MkdirTemp("", "fluxvault-mock-")
	if err != nil {
		return nil, err
	}
	return &Objects{dir: dir, sizes: map[string]int64{}}, nil
}

// Close 删除当前 mock 实例专属临时目录及其中的正文文件
func (s *Objects) Close() error { return os.RemoveAll(s.dir) }

// Upload 先预留容量再有界写入正文，失败释放预留量并清理未提交文件
func (s *Objects) Upload(ctx context.Context, _ storage.Instance, id string, body io.Reader) (storage.Locator, int64, error) {
	// 并发上传先预留单文件最大容量，写入成功后按实际字节数结算
	s.mu.Lock()
	if s.used+MaxFileBytes > MaxTotalBytes {
		s.mu.Unlock()
		return storage.Locator{}, 0, ErrCapacity
	}
	s.used += MaxFileBytes
	s.mu.Unlock()
	committed := false
	defer func() {
		if !committed {
			s.mu.Lock()
			s.used -= MaxFileBytes
			s.mu.Unlock()
			_ = os.Remove(filepath.Join(s.dir, id))
		}
	}()
	f, err := os.OpenFile(filepath.Join(s.dir, id), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return storage.Locator{}, 0, err
	}
	// 多读取一个字节用于区分恰好达到上限与超限
	size, copyErr := io.CopyBuffer(f, io.LimitReader(body, MaxFileBytes+1), make([]byte, 32<<10))
	closeErr := f.Close()
	if copyErr != nil {
		return storage.Locator{}, 0, copyErr
	}
	if closeErr != nil {
		return storage.Locator{}, 0, closeErr
	}
	if ctx.Err() != nil {
		return storage.Locator{}, 0, ctx.Err()
	}
	if size > MaxFileBytes {
		return storage.Locator{}, 0, ErrFileTooLarge
	}
	s.mu.Lock()
	s.used -= MaxFileBytes - size
	s.sizes[id] = size
	s.mu.Unlock()
	committed = true
	return storage.Locator{ObjectKey: id}, size, nil
}

// Download 打开 mock 正文并移交流关闭责任，读取失败映射为安全错误
func (s *Objects) Download(_ context.Context, _ storage.Instance, l storage.Locator) (io.ReadCloser, error) {
	f, err := os.Open(filepath.Join(s.dir, l.ObjectKey))
	if err != nil {
		return nil, ErrContentUnavailable
	}
	return f, nil
}

// Delete 删除正文并释放容量，已不存在时按幂等成功处理
func (s *Objects) Delete(_ context.Context, _ storage.Instance, l storage.Locator) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(filepath.Join(s.dir, l.ObjectKey))
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	s.used -= s.sizes[l.ObjectKey]
	delete(s.sizes, l.ObjectKey)
	return nil
}
