# Go 文件中转与网关配置

Go Native 与 Worker 使用相同的附件下载和图片预览行为。`/api/v1/files/{id}/content` 返回原始附件，`/api/v1/files/{id}/preview` 返回按签名识别的可内嵌图片；Admin 对应 `/admin/v1`。浏览器只访问 FluxVault 的 IP 或域名，不跳转到 Telegram、GitHub、S3，也不获取 Provider 的凭据或下载 URL。预览支持 PNG、JPEG、GIF、WebP、AVIF、BMP，读取上限 8 MiB，不转码；其他格式的处理以 [预览契约](../../contracts/worker-preview.openapi.yaml) 为准。

## 入口配置

默认 mock 只允许回环监听。真实运行使用 [D1 配置模板](../../apps/server-go/config.d1.example.yaml)，填写独立的数据库与 Provider 配置。D1 模式支持 IPv4、IPv6 监听 IP；域名解析到服务端 IP 后即可通过域名访问，无需让 Go 绑定域名。

- Nginx 与 Go 在同机时，保留 `public_address: 127.0.0.1:18080`、`admin_address: 127.0.0.1:18081`。
- 需要直接通过服务端 IP 访问 HTTP 时，Public 可配置 `public_address: 0.0.0.0:18080`（IPv6 为带引号的 `"[::]:18080"`）。Admin 地址独立配置，按实际入口安排。
- `allowed_origin` 填浏览器实际打开管理台的完整 origin，包含协议和非默认端口，例如 `https://console.example.com`；它不表示 Provider 或网关回源地址。

## HTTP 与 HTTPS

Go 监听 HTTP，HTTPS 由 Nginx 等网关终止。外部 HTTPS 请求经过网关成为发给 Go 的 HTTP 请求，Go 的正文响应经同一网关以 HTTPS 返回浏览器；外部 HTTP 访问也可独立工作。Go 的预览和下载响应不构造绝对 URL、不返回 Location，也不根据 `X-Forwarded-Proto` 改写 Provider URL，因此不存在回源协议导致的 HTTPS 降级跳转。

管理台构建时设置**外部可访问地址**，不能填写网关内部的回源地址：

```bash
VITE_ADMIN_API_URL=https://admin.example.com \
VITE_PUBLIC_API_URL=https://files.example.com \
npm --prefix apps/web run build
```

HTTP 部署同样可将两个值填为 `http://服务端IP:对应端口` 或 HTTP 域名。HTTPS 管理台应配置 HTTPS API，避免浏览器混合内容拦截。复制的公开链接保留 `VITE_PUBLIC_API_URL` 的协议；需要另一种协议时使用对应的外部 origin 构造相同 API 路径。Go 到 Telegram/GitHub 的请求仍使用官方 HTTPS；S3 使用实例 Secret 的 endpoint 协议，与浏览器访问协议无关。

[Nginx 示例](../../config/nginx.example.conf) 同时监听 80 和 443，保留 Public/Admin 两个入口并通过 HTTP 回源；使用前替换域名和证书路径。`proxy_pass` 不带 URI 后缀，以保留原请求路径，参见 [Nginx 官方文档](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)。网关不应启用绕过业务权限和状态检查的整页缓存。示例不是自动部署脚本。

## 内部缓存

D1 模式只缓存 Public 入口的公开文件正文，附件与预览按主机、路径、元数据更新时间分开；查询参数不产生额外副本。每次请求先检查认证、可见性和 ready 状态，失效或删除的记录不能读取旧副本。私有文件、管理入口和 mock 绕过缓存；客户端始终 `Cache-Control: no-store`。

Go 使用进程内缓存，保留时间一小时，每份最多 8 MiB、总正文最多 32 MiB、最多 256 项，满时淘汰最早过期条目。进程重启和容量淘汰只增加回源，不改变访问结果；与 Worker 的 Cloudflare Cache API 独立。附件保持流式转发，只在完整成功后保存有界副本，读取或发送失败不缓存。

## 静态检查与历史验证

```bash
(cd apps/server-go && go vet ./... && go build ./...)
```

2026-10-27 已按用户要求清理测试源码、黑盒检查脚本和浏览器产物；以上仅为静态及构建检查。此前本地 HTTP/TLS 网关、SDK 隔离与浏览器结果保留在 [验证记录](verification.md)，历史测试命令不再是当前执行入口。真实 Telegram、D1、证书、Nginx 配置加载和部署需在对应环境验收。
