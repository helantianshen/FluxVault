# 存储 SDK 适配器

日期：2026-10-18。用户已确认真实适配器参与编译和测试，只注释启用示例，保留 mock 为默认运行模式。

## 当前交付范围

Go 和 Worker 均通过现有 `ObjectStore` 端口实现真实 SDK 的上传、代理下载与删除行为。实现位于 `infra/providers`；模型、配置校验、实例分发、流处理及各 Provider 分文件。业务 Service、HTTP 契约和前端不引用 SDK。

默认 `Mock` / `createMock` 不构造真实适配器，也不读取 Provider Secret。填入下方配置不会自行启用真实请求。`app/sdk.go` 和 `app/sdk.ts` 提供对象存储工厂；2026-10-24 新增的显式 D1 入口将它们与持久化仓储组装，见 [D1 接入](d1.md)。真实启用前仍需填写配置、应用迁移，并单独联调 Provider。不能把真实对象存储接到会在重启后丢失的 mock 元数据或演示种子上。

本轮不创建 bucket、GitHub repository/release、Telegram chat，不启动机器人轮询、不注册 webhook，不实施远程部署，也不加入 S3 直传或分片上传。

## SDK 与运行时

| Provider | Go Native | TypeScript Worker |
| --- | --- | --- |
| S3 / RustFS / MinIO | AWS SDK Go v2，S3 v1.114.3、credentials v1.20.9 | `@aws-sdk/client-s3` 3.1152.0、`@smithy/fetch-http-handler` 5.8.0 |
| GitHub Release | `google/go-github/v93` v93.0.0 | `@octokit/core` 7.0.8 |
| Telegram Bot API | `go-telegram/bot` v1.27.0 | `grammy` 1.46.0 的 `grammy/web` 入口 |

实际依赖及传递依赖以各应用锁文件为准。Go 模块最低版本仍为 1.26；本地验证版本为 1.27.1。Worker 显式使用 Fetch HTTP handler 与 grammY Web 入口；隔离 workerd 测试不启用 Node compatibility，也不借用 Node 的文件系统或网络模块。

S3 使用自定义 endpoint、静态凭据、明确 region 和 path-style 寻址。RustFS 与 MinIO 共用该适配器；不调用 AWS 的默认凭据探测链。SDK 的可选自动 checksum 设置为 `WHEN_REQUIRED`，避免默认附加功能影响兼容端点；服务本身要求的校验仍由 SDK 执行。S3 SDK 自动重试次数设为一次请求，应用保留失败记录，不对未知上传结果自动重发。

## Secret 格式

实例依旧只保存 `secret_ref`。该名称指向一个 JSON 字符串：Native 从对应环境变量读取，Worker 从同名 Secret binding 读取。共享占位示例见 [provider-secrets.example.json](../../config/provider-secrets.example.json)。该文件不会自动加载，不能填入真实凭据后提交仓库。

| Secret 示例名 | 必填字段 | 可选字段 / 条件 |
| --- | --- | --- |
| `S3_PRIMARY` | `endpoint`、`region`、`bucket`、`access_key`、`secret_key` | `prefix` 默认空；`session_token` 用于临时凭据 |
| `GITHUB_RELEASE` | `owner`、`repo`、`release_id`、`token` | `release_id` 为已有发行的正整数 ID |
| `TG_ARCHIVE` | `bot_token`、`chat_id` | `chat_id` 必须是十进制数字字符串，群组/频道可带负号 |

配置拒绝未知字段、空 Secret 与无效目标；不会回落到 mock 或其他实例。S3 endpoint 指向对象 API 端口，例如 `http://127.0.0.1:9000`，不指向管理控制台，且不带用户名、密码、查询参数或子路径。公共网络使用 HTTPS。GitHub 与 Telegram 目前使用官方 API 域名，不支持企业版 GitHub 或自建 Bot API Server。

GitHub Token 需要所选仓库的 Contents 读写权限，Release 必须预先存在。当前实例策略只允许 GitHub 公开文件。Telegram Bot 需要具备目标 chat 的发文件权限。应用不赋予这些外部权限。

## 数据与失败语义

上传仍受 8 MiB 单文件限制。Go 先写入权限为 0600 的专用临时文件，使 SDK 获得准确长度和可回读内容，完成或失败都清理临时文件；Telegram Go SDK 内部仍会缓存 multipart 请求。Worker 有界读取请求后提交 SDK，不进行无限 `arrayBuffer()` 读取。此实现用于当前代理上传范围，不宣称支持大文件或零拷贝上传。

下载保留流式正文；GitHub 显式处理 200 和 302，CDN 只接受 HTTPS 的 GitHub 内容域名，不转发仓库 Token，也不保存临时签名链接。Telegram 每次通过 `getFile` 获取路径，使用 `file_id` 而非 `file_unique_id`；带 Bot Token 的下载地址只在服务端请求中使用。响应错误及正文读取错误映射为安全的 `storage_failure`，不返回 SDK 原始错误、Token 或完整签名 URL。请求超时为 120 秒；TS 的端口没有调用方 AbortSignal 参数，本轮没有宣称浏览器取消可直接传播至 Provider。

`Locator.objectKey` 在真实适配器中保存版本化内部 JSON：`v`、`provider`、`instance`、`target`、`key`。最后一个字段分别是 S3 object key、GitHub asset ID、Telegram file ID。定位符不含凭据；目标绑定覆盖 S3 endpoint/bucket/prefix、GitHub owner/repo/release、Telegram bot ID/chat ID。更换访问密钥可继续使用原定位符，修改目标则拒绝读删，必须建立新实例。mock 定位符不会被当成真实定位符使用。

S3 执行 `DeleteObject`。GitHub 删除返回 404 时，还需确认资产不存在且 Release 可访问，才视为幂等成功，避免把权限问题当成删除完成。Telegram 不调用消息删除或远端文件删除，沿用仅删除元数据的规则。

上传/元数据确认失败继续由应用保留 pending；远端删除/元数据清理失败继续保留 deleting。真实服务联调和 D1 失败恢复未由本轮测试覆盖。

## 当前验证入口

2026-10-24 已按用户要求移除 Go/TS 测试、workerd 辅助入口及真实 S3 联调脚本。当前仅提供静态检查和构建：

```bash
(cd apps/server-go && go vet ./... && go build ./...)
npm --prefix apps/worker-ts run lint
npm --prefix apps/worker-ts run typecheck
npm --prefix apps/worker-ts run build
npm run format:check
```

此前 SDK 隔离测试和 2026-10-21 RustFS 联调结果保留在 [验证记录](verification.md)，只证明对应日期与范围，不代表当前仍有测试入口或生产验收。后续真实联调需重新准备工具并取得对应实例操作授权。

## 官方依据

- [RustFS SDK 概览](https://docs.rustfs.com/en/developer/sdk)：推荐 AWS S3 SDK，也支持 MinIO SDK。
- [RustFS Go SDK 指南](https://docs.rustfs.com/en/developer/sdk/go)：AWS Go v2 与自定义 endpoint。
- [MinIO S3 HTTP 端点](https://docs.min.io/aistor/reference/aistor-server/http-endpoints/)：S3 客户端使用对象 API 端口与 Signature V4。
- [Cloudflare AWS JS v3 示例](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)：S3 客户端的 endpoint 与凭据配置。
- [GitHub Release Assets API](https://docs.github.com/en/rest/releases/assets)：二进制上传、资产 ID、200/302 下载和删除。
- [go-github](https://github.com/google/go-github)、[Octokit Core](https://github.com/octokit/core.js)：GitHub SDK。
- [Telegram Bot API](https://core.telegram.org/bots/api#getfile)、[go-telegram/bot](https://github.com/go-telegram/bot)、[grammY 文件处理](https://grammy.dev/guide/files)：文档上传、文件 ID 与临时下载路径。
