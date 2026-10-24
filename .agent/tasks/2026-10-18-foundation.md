# FluxVault 首阶段工程搭建

更新时间：2026-10-18 Asia/Shanghai。

## 目标

分析用户 DOCX，搭建 Go 和 TS/Hono 两套 DDD 后端、共享契约及迁移、mock 闭环；先交付产品原型供审查，批准后实现 React 前端。

## 环境事实

初始目录 /home/helan/own/FluxVault 为空，无 Git。Linux x86_64，本地非容器/远程会话；执行 Bash，账户默认 Shell 为 fish。Go 1.27.1，Node 24.20.0，npm 11.19.0，Playwright CLI 0.1.22。没有对历史环境作假设。

## 用户决定

- 本阶段 mock 闭环；真实适配器下一阶段。
- 凭据使用环境变量/Secret 引用。
- JWT 默认 12 小时、浏览器内存保留 Token。
- 文件列表为中心，右侧详情；用户已批准原型，按该设计实现 React。
- 切换、点击、详情与弹窗适当增加轻量动效，并保留减少动态效果支持。

## 状态

需求已提取，原始 DOCX 未修改。两端领域层、应用层、基础设施和 HTTP 入口、共享 OpenAPI、D1 SQL 迁移草案、React 管理台、启动及验收文档已实现。领域模型和业务规则分文件；应用用例通过端口访问 mock Repository 与对象存储。

本阶段实现登录、文件上传/筛选/详情/下载/删除重试、实例管理、API Key 生命周期和系统信息。pending/deleting 保留失败记录，上传、删除及元数据失败行为有测试；公开/私有、scope 和归属通过同一套契约测试验证。真正的 D1/TG/GitHub/S3 接入和生产初始化属于下一阶段。

React 已完成桌面、移动浏览器验证，包含请求中的上传反馈和减少动态效果。独立视觉复核指出的空筛选恢复、过期 Key 样式、状态文字对比度、移动导航焦点四项均已修正并经过定向浏览器验证；同一复核者回看后四项 resolved，remaining clear，结论 ship，仅覆盖本批修正。DESIGN.md 与 .impeccable/design.json 已同步到实际 React 行为，主代理核对了内容、状态色、格式和引用。

## 验证与剩余工作

已通过：Go fmt/vet/build 和 race 测试（8）；Worker lint/typecheck/Vitest（8）与 dry-run 打包；Web lint/typecheck/Vitest（2）与构建；两端隔离黑盒契约（2 套完整流程）；OpenAPI lint/类型生成；本地 SQLite 迁移约束；Playwright 文件、实例、Key、移动端与四项修正验证。最终代码格式检查通过。完整范围和未验收边界见 docs/specs/verification.md。

首阶段 mock 工程与已批准界面的实现完成。Go 两个入口、Worker 健康检查和 React 预览最终探测均返回 200；React 以独立进程运行。Codex 浏览器打开请求已排队。主 JS chunk 约 538 kB（gzip 167 kB），Vite 提示超过默认阈值，未隐藏此提示。

后续需要用户配置真实 D1/Provider、确认 S3 直传专项契约，再进入真实接入和部署验收；本轮无待回答的问题。用户可以继续对正式 React 界面进行手工反馈。

当前本地预览：React 5173，Go Public 18080 / Admin 18081，Worker 8787；8080 为其他应用占用，未动。Go/Worker 本次演示由 .local/demo-processes.json 记录自有进程，日志在 .local/；演示密码见 README。任何清理须核对进程命令，不能按端口广泛终止。

本目录仍无 Git 仓库；没有执行初始化、提交、推送、PR 或远程部署。CI 仅写入工作流文件，没有远程执行记录。本地 SQL/浏览器检查不代表真实 D1 或 Provider 验收。
