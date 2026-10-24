# 存储 SDK 适配器接入

更新时间：2026-10-18 Asia/Shanghai。

## 目标与确认

为 Go Native 与 TypeScript Worker 实现 S3（RustFS/MinIO）、GitHub Release、Telegram 的 SDK 适配器。保留现有 mock 默认运行，不连接真实账户，不扩大到 D1、前端、直传或部署。

用户已确认：真实适配器正常参与编译和测试，仅注释启动组装处的启用示例；不把适配器主体注释成无法检查的死代码。现有 Secret 引用约定继续有效。

## 环境

本地 Linux x86_64，执行 Bash、账户默认 fish。Go 1.27.1、Node 24.20.0、npm 11.19.0。目录 /home/helan/own/FluxVault，未初始化 Git。适用全局 AGENTS 与 policies；不覆盖首阶段任务记录。

## 当前状态

三种 Provider 的 Go/TS 适配器、JSON Secret 校验、版本化目标绑定、临时文件/有界缓冲、流式下载、错误脱敏、bootstrap 工厂及注释状态的组装示例已完成。默认 mock 入口未启用任何真实适配器。原有领域模型、API 和 UI 未变更。

采用 AWS Go v2 / JS v3、go-github v93 / Octokit Core、go-telegram/bot / grammY Web。版本从官方包源核实并锁定。继续现有 8 MiB 代理上传边界，真实大文件/直传不纳入本轮。

已通过 Go SDK 定向测试（4 组）、TS SDK 定向测试（9 场景）、真实 workerd 中的同组 9 场景。曾发现 Octokit 自定义上传 URL 缺少 name 查询模板，已修正并通过字节级请求检查。workerd 的 TG 失败来自测试用 FormData 对 SDK 未加引号文件名的解析差异；改为核对实际 multipart 头及二进制请求字节后通过，未修改 SDK 或生产上传行为来迎合测试。

本轮实现和本地验证已完成。Go vet/race/build 全部通过，包含原有 8 项应用测试与新增 4 组 SDK 测试。Worker lint/typecheck、17 项测试及 dry-run 构建通过；真实 workerd 中的 9 个 SDK 场景、双端 mock 契约与格式检查通过。最后一次下载流取消错误脱敏修改后，重新执行 Worker lint/typecheck/17 项测试、workerd 9 场景和格式检查，均通过。

配置样例和接入说明已补齐，JSON 及文档链接已检查。测试启动工具提取到 scripts/lib/local-services.mjs，两个隔离验证脚本复用；对应 CI 入口已添加，远程 CI 未运行。没有前端修改，本轮未重复浏览器视觉验收。

## 验证边界与后续

使用真实 SDK 加受控 HTTP transport/fetch 验证序列化、认证、上传字节、下载、删除和错误脱敏。Worker 另做 workerd 运行时验证，避免只在 Node 中通过。已回归两端 mock 契约与应用测试。没有真实凭据，不宣称真实 Provider 兼容性验收。

本轮没有待确认问题。后续阶段仍需接入 D1 与持久化元数据，再组装真实运行入口并使用用户配置的目标验收；仅填写 Secret 不会启用真实请求。

不创建 Git 提交、PR、远程资源或外部消息。
