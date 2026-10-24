# 链路审查问题修复

日期：2026-10-23。状态：完成。用户授权仅修复前一轮确认的两个问题，保持接口和其他行为不变。

## 实施

- Go 下载：检查复制错误及实际字节数；读取失败、提前 EOF 或长度不符时使用 `http.ErrAbortHandler` 中止传输，仍以 32 KiB 缓冲流式输出，不追加 JSON、不修改成功响应头或 API 契约。保留上游正文的 defer Close。
- Gin 1.12 的 Recovery 会把该信号记入 Context.Errors 并吞掉；在原有 Recovery 返回后仅对这一信号重新 panic，交由 net/http 关闭 HTTP/1.1 连接或重置 HTTP/2 流。其他 panic 保持原有处理和 500 响应。
- Web 列表成功刷新且结束 fetching 后，用最新 total 校正越界 offset 到最后一个有效页；有效页保持不动。删除回调、筛选、详情关闭、DOM、样式和动效不变。

既有 153 个源文件/契约/配置哈希中，只有 handler.go、server/http.go、files-page.tsx 三个目标文件发生变化，无文件丢失。新增 Go 下载回归与浏览器分页片段，并更新验证说明。修改前备份与本轮隔离材料位于 `/tmp/fluxvault-chain-fixes-yi47pwm9/`。

## 验证

- Go 新增真实 httptest TLS 连接测试，覆盖 HTTP/1.1 和 HTTP/2，各 10 个场景：完整小文件、完整流、空文件、首字节前错误、缓冲内/已输出后的读取错误、两种提前 EOF、预期长度处仍返回错误、超长流；同时验证上游关闭和成功响应头。普通 panic 的 500 单独回归。
- 用 overlay 将两个生产文件替换为修复前备份，同组测试有 14 个错误传输场景失败；恢复本轮实现后全部通过。
- `env -u FLUXVAULT_S3_TEST_CONFIG go test -race -count=1 ./...`、`go vet ./...`、`go build ./...` 通过；真实 S3 测试保持未启用。
- Web lint、typecheck、Vitest 2 项、build 通过。主 chunk 约 538 kB 的既有提示保留。
- `npm run test:contract` Go/Worker 两套完整黑盒契约通过；`npm run format:check` 通过。
- Playwright CLI 使用新启动的独立 Go mock/Vite、随机回环端口和专用会话，实际上传种子并通过 UI 删除。桌面 22→21 保持第 2 页、21→20 回第 1 页、41→40 回第 2 页；390×844 移动视口 21→20 回退并关闭详情，1→0 显示空状态。页面无横向溢出，控制台无 error/warning。初次片段误点无点击处理的 tr，改为行内详情按钮并重建本轮种子后完整通过。
- 已查看 1440×1000、390×844 截图；仅证明此次桌面/移动视口的既有布局与修复交互，不代表物理设备或其他浏览器引擎验收。Impeccable 检测为 `[]`；工具报告已有设计索引过期和营销页 buildPath 未设置，未扩大任务去修改这些配置。

未连接真实 Provider、D1、生产服务或远程 CI，未部署、提交、推送。只清理本轮隔离服务与浏览器会话，保留已有用户进程。测试源码位于 `apps/server-go/internal/server/download_test.go` 和 `tests/browser/web/check-file-pagination.cjs`；后者的种子条件见 `tests/browser/README.md`。
