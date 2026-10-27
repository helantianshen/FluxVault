// HTTP 正文缓存：公开响应保留有界副本，身份与元数据校验始终先于读取缓存

package file

import (
	"bytes"
	"sync"
	"time"
)

const (
	maxCachedBody   = 8 << 20   // 每份正文最多 8 MiB，与代理上传上限一致
	maxCacheBytes   = 32 << 20  // 每个进程最多缓存 32 MiB 正文
	maxCacheEntries = 256       // 条目数同时有界，防止空文件与主机名占用无限元数据
	cacheTTL        = time.Hour // 内部副本有效一小时，客户端始终 no-store
)

type cachedBody struct {
	bytes       []byte
	contentType string
	expires     time.Time
}

type bodyCache struct {
	mu      sync.Mutex
	entries map[string]cachedBody
	size    int
}

func newBodyCache() *bodyCache { return &bodyCache{entries: make(map[string]cachedBody)} }

func (c *bodyCache) get(key string) (cachedBody, bool) {
	if c == nil || key == "" {
		return cachedBody{}, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if ok && !time.Now().Before(entry.expires) {
		c.remove(key)
		return cachedBody{}, false
	}
	return entry, ok
}

func (c *bodyCache) put(key string, body []byte, contentType string) {
	if c == nil || key == "" || len(body) > maxCachedBody {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.remove(key)
	now := time.Now()
	for k, entry := range c.entries {
		if !now.Before(entry.expires) {
			c.remove(k)
		}
	}
	// ponytail: 最多 256 项，按过期时间线性淘汰；容量增大后再使用有序队列
	for c.size+len(body) > maxCacheBytes || len(c.entries) >= maxCacheEntries {
		var oldest string
		var expires time.Time
		for k, entry := range c.entries {
			if oldest == "" || entry.expires.Before(expires) {
				oldest, expires = k, entry.expires
			}
		}
		c.remove(oldest)
	}
	c.entries[key] = cachedBody{bytes: body, contentType: contentType, expires: now.Add(cacheTTL)}
	c.size += len(body)
}

// remove 由持锁调用方执行，正文发布后只读，正在发送的响应可以继续持有被淘汰条目
func (c *bodyCache) remove(key string) {
	c.size -= len(c.entries[key].bytes)
	delete(c.entries, key)
}

type boundedCapture struct{ buffer *bytes.Buffer }

func (w *boundedCapture) Write(p []byte) (int, error) {
	if w.buffer.Len() <= maxCachedBody && len(p) <= maxCachedBody-w.buffer.Len() {
		_, _ = w.buffer.Write(p)
	}
	return len(p), nil
}
