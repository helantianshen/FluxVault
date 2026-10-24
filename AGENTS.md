# FluxVault 项目规则

## 范围与入口

本项目是个人 Go Native / Hono Worker 双后端与 React 管理台。修改前读取 [代码组织](docs/specs/code-organization.md)、[工程边界](docs/specs/foundation.md) 及相关专项 Spec；API 以 `contracts/*.openapi.yaml` 为准。

本机全局入口为 `/home/helan/.codex/AGENTS.md`，按任务加载其 `policies/` 专题。全局规则文件不在其他环境时，以本文件、项目 Spec 和用户当前指令为依据，不猜测缺失规则。2026-10-22 的模块组织取代此前五层目录；历史任务和验收保留原日期。

## 代码组织

- Go 使用 `internal/modules/{file,storage,identity,auth}`。每模块一个包，按 `handler.go`、`service.go`、`repo.go`、`model.go`、`errors.go` 等职责分文件，不设置独立 Biz 或五层目录。
- `internal/app` 负责显式组装与生命周期，`internal/server` 集中路由与 HTTP 参数，`internal/config` 加载配置，`internal/infra` 放对象存储和内存实现，`internal/middleware` 放认证中间件，`internal/httpx` 只处理公共协议能力。
- 有持久化职责的模块在 `repo.go` 定义 `Repository`。D1 实现位于 `infra/d1`，配置和迁移见 `docs/specs/d1.md`；默认 mock 实现位于 `infra/memory`，实现类型私有、构造返回模块接口。文件和实例共享同一把锁，保证上传建记录与删除实例的引用检查原子性；不要为模块内构造函数增加转发层或造成 import 环。
- 文件业务通过存储实例 Service 的最小接口读取实例及校验上传能力，不能取得实例仓储的任意写权限。Handler 只调用 Service；Service 不依赖 HTTP 框架或 Provider SDK。
- Worker 使用扁平的 `src/modules`、`app`、`server`、`infra` 责任目录；模块保留 Hono、Zod 和 Web API 的惯用方式，共享内存状态与同步引用检查不能拆散。
- React 保留 `app/features/components/api/lib`。查询和业务展示归所属功能，通用组件不承载业务所有权；不要手改 `src/api/schema.d.ts`。
- 类型生成工具保留在 `scripts`；OpenAPI 在 `contracts`。2026-10-24 已按用户要求清理测试源码、辅助脚本及产物，历史验收记录只作为历史证据。

## 项目兼容性约束

- 保留现有 OpenAPI：成功返回契约定义的 JSON，错误为 `{ "error": { "code": "...", "message": "..." } }`，必要时包含安全的 `file_id`。本次结构整理不迁移到全局默认整数响应外壳，也不改变 HTTP 状态、流或 204 响应。协议变更需单独任务同步双后端、契约和前端。
- 保留 `pending → ready` 与 `deleting` 失败恢复、API Key scope/所有权/撤销终态、管理员 JWT、Secret 引用和 SDK 错误脱敏。
- 默认始终是 mock；存在 Secret 不代表启用真实 Provider。不得将真实对象存储接到易失的演示元数据。D1 代码已实现；远程迁移、真实服务联调和部署仍是独立授权范围。
- 不因目录整理升级依赖、重置本地配置、删除用户产物或进行 Git 写操作。无 Git 时，大范围迁移前保存项目外源码备份。

## 验证

按改动运行 Go `gofmt` / `vet` / `build`，Worker 和 Web 的 lint / typecheck / build，以及根 `format:check`、`contracts:lint` 和 `contracts:types`。测试文件和执行入口已清理，不把无测试文件的编译结果称为回归测试通过。

Worker build 仅 dry-run。不得以静态检查代替浏览器、真实 Provider、D1 或部署验收；需要重新增加测试时按用户授权范围实施。
