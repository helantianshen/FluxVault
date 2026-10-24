// 存储流处理：有界暂存、取消检查及下载错误脱敏

package providers

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

// spool 将最多 8 MiB 正文写入 0600 临时文件并回到起点，失败立即清理资源
func spool(ctx context.Context, body io.Reader) (*os.File, int64, func(), error) {
	f, err := os.CreateTemp("", "fluxvault-upload-*")
	if err != nil {
		return nil, 0, nil, storageError()
	}
	cleanup := func() {
		_ = f.Close()
		_ = os.Remove(f.Name())
	}
	// 临时文件由调用方在成功路径清理，此处负责全部失败路径
	size, err := io.Copy(f, io.LimitReader(&contextReader{
		ctx:    ctx,
		reader: body,
	}, MaxUploadBytes+1))
	if err != nil || ctx.Err() != nil {
		cleanup()
		return nil, 0, nil, storageError()
	}
	if size > MaxUploadBytes {
		cleanup()
		return nil, 0, nil, ErrUploadTooLarge
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, 0, nil, storageError()
	}
	return f, size, cleanup, nil
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

// Read 在每次读取前检查上下文取消，再读取原始流
func (r *contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(p)
}

type safeBody struct{ io.ReadCloser }

// Read 读取上游正文，保留 EOF 并脱敏其他读取错误
func (b *safeBody) Read(p []byte) (int, error) {
	n, err := b.ReadCloser.Read(p)
	if err != nil && !errors.Is(err, io.EOF) {
		err = storageError()
	}
	return n, err
}

// Close 关闭上游响应流并将失败转换为安全的存储错误
func (b *safeBody) Close() error {
	if b.ReadCloser.Close() != nil {
		return storageError()
	}
	return nil
}

// githubDownloadURL 只允许无用户凭据的 HTTPS GitHub 内容域名和默认 TLS 端口
func githubDownloadURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && u.Scheme == "https" && u.User == nil && (u.Port() == "" || u.Port() == "443") && strings.HasSuffix(u.Hostname(), ".githubusercontent.com")
}

// getBody 发起受上下文控制的匿名 GET，仅在 200 时移交响应流所有权
func getBody(ctx context.Context, client *http.Client, raw string) (io.ReadCloser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		return nil, err
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		_ = res.Body.Close()
		return nil, storageError()
	}
	return res.Body, nil
}
