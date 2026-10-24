# FluxVault

多存储源文件托管服务的首阶段工程基础。Go Native 与 TypeScript/Hono Worker 独立运行，使用相同的 Public/Admin OpenAPI；React 管理台对接其中任意一个后端。默认运行本地 mock 闭环；S3（RustFS/MinIO）、GitHub Release、Telegram 的 SDK 适配器已实现并保持停用，RustFS S3 曾完成显式真实往返验证，默认业务入口尚未连接真实账户或 D1。

## 快速运行

需要 Go 1.26+、Node 24、npm 和 Python 3（迁移检查）。从项目根目录安装前端与工具依赖：

```bash
npm ci
npm ci --prefix apps/web
npm ci --prefix apps/worker-ts
```

下面是 Bash 示例。本地演示密码和签名值不是生产凭据。mock 只接受回环地址，元数据和对象会在后端重启后丢失。

### Go Native

```bash
cd apps/server-go
export FLUXVAULT_MOCK_ADMIN_PASSWORD='local-demo-password'
export FLUXVAULT_JWT_SECRET='local-demo-signing-secret-change-before-use-32'
go run ./cmd/server -config config.example.yaml
```

Public API：`http://127.0.0.1:18080`；Admin API：`http://127.0.0.1:18081`。`/healthz` 返回当前后端和 mock 模式。启动必须显式设置演示凭据；未设置会拒绝启动。

另开终端，在项目根目录启动前端：

```bash
npm --prefix apps/web run dev
```

打开 <http://127.0.0.1:5173>，用户名 `admin`，密码为上面设置的值。Token 仅保存在页面内存；刷新页面后重新登录。开发期间的整页热更新也会清除登录状态。

### TypeScript Worker

在 `apps/worker-ts` 中，首次把 `.dev.vars.example` 复制为 `.dev.vars`，然后运行：

```bash
npm run dev
```

本地 Worker：`http://127.0.0.1:8787`。仅本地 mock 将 Public/Admin 两组路由放在同一个入口。前端切换 Worker 时，先停止已运行的前端，再从项目根目录启动：

```bash
VITE_ADMIN_API_URL=http://127.0.0.1:8787 npm --prefix apps/web run dev
```

两端数据独立。部署时只选择一种后端；未来真实 Worker 接入需分离 Public/Admin 主机入口，不能直接发布当前本地 mock 配置。

## 已有功能

- 管理员 bcrypt 登录、12 小时默认 JWT；Public Key 与 Admin JWT 分离。
- 文件分页、筛选、上传（支持拖放与 `/` 搜索快捷键）、详情、下载、删除与删除重试。
- 上传先建 pending 记录，完成后变为 ready；失败保留错误代码和记录 ID；删除失败保留 deleting。
- Key 的 scope、文件所有权、有效期、禁用、重新启用、轮换和永久撤销。原文只在创建或轮换时返回。
- 存储实例增删、重命名、启停；Secret 引用；公开 GitHub 实例拒绝 private；有关联文件时不能删实例。
- Telegram 仅删元数据，S3/GitHub 先删对象再删元数据。此处执行的是对应语义的 mock。
- React 桌面右侧详情、移动抽屉，表单校验、确认操作、加载与错误状态；短促的页面、详情、弹窗及点击反馈，适配减少动态效果偏好。

每次启动生成三种存储实例和五条示例文件记录，其中 pending/deleting 是明确命名的故障演示数据。可重试删除 deleting 示例；pending 保留供排查，不提供未经远端核验的“强制成功”操作。示例只包含本地文本，没有真实云数据。

## 结构与约束

```text
apps/
  server-go/       Go + Gin + Viper，两个独立监听端口
  worker-ts/       Hono + Zod + JOSE，本地 workerd
  web/             React + Vite + Tailwind + Radix + TanStack Query
contracts/         OpenAPI 3.1，两端接口唯一来源
database/         D1 SQL migrations（本阶段仅本地语法/约束校验）
design/prototype/  已获认可的交互原型
docs/specs/        模块组织、业务边界与阶段验收
scripts/           OpenAPI 类型生成
AGENTS.md          项目规则、契约例外与验证入口
```

两种后端按 `modules/{file,storage,identity,auth}` 收拢业务，模块内以 Handler → Service → Repository 接口协作；`app` 负责显式组装，`server` 负责路由，`infra` 实现内存与外部存储。Go 配置和认证中间件分别位于 `config`、`middleware`。HTTP 层不操作数据库或存储 SDK。具体目录与构造入口见 [代码组织](docs/specs/code-organization.md)，业务边界见 [工程 Spec](docs/specs/foundation.md)，术语见 [GLOSSARY.md](GLOSSARY.md)，视觉规范见 [DESIGN.md](DESIGN.md)。

前端按 auth/files/instances/keys/settings 分功能；请求封装、生成契约类型、共享控件与业务页面分开。Radix 提供对话框、下拉选择及焦点管理，React Hook Form/Zod 管理表单，Motion 处理状态过渡。各应用有独立 package/go module 和锁文件，不依赖根目录运行时。

开发前读取 [项目规则](AGENTS.md)。

不要手改 `apps/web/src/api/schema.d.ts`。修改 OpenAPI 后执行 `npm run contracts:types`。

## 真实存储 SDK

两端的 `infra/providers` 包含可编译、可测试的真实 SDK 适配器。`app/sdk.go` / `app/sdk.ts` 提供工厂和注释状态的启用示例，默认入口保持 mock。Go 使用 AWS SDK v2、go-github、go-telegram/bot；Worker 使用 AWS SDK v3、Octokit、grammY Web。

实例的 Secret 引用对应一个环境变量/Cloudflare Secret 中的 JSON 字符串，格式见 [配置示例](config/provider-secrets.example.json)。填入 Secret 不会自动启用 SDK；真实运行还需要持久化 Repository 和独立联调。范围、目标绑定、错误处理与限制见 [SDK 接入说明](docs/specs/provider-sdks.md)。

## 验证

2026-10-24 按要求清理全部测试源码、测试辅助工具和浏览器测试产物。以下命令只进行静态检查与构建；历史验收记录不代表当前仓库仍提供可执行测试。

```bash
npm run contracts:lint
npm run contracts:types
npm run format:check
npm --prefix apps/worker-ts run lint
npm --prefix apps/worker-ts run typecheck
npm --prefix apps/worker-ts run build
npm --prefix apps/web run lint
VITE_ADMIN_API_URL=http://127.0.0.1:18081 npm --prefix apps/web run build
(cd apps/server-go && go vet ./... && go build ./...)
```


Worker 的 `build` 仅 `wrangler deploy --dry-run`，不会部署。CI 保留格式、静态检查、契约类型生成及构建检查。

前端构建必须显式指定管理 API 地址；若用于 HTTPS 站点，地址也应使用 HTTPS，并配置后端允许的 Origin。预览本地构建产物：`npm --prefix apps/web run preview`（需停止占用 5173 的开发服务）。静态托管需为客户端路由提供回退到 `index.html`；`public/_redirects` 提供支持该格式的平台规则。

## 当前阶段边界

mock 每个文件最大 8 MiB、对象总量最多 32 MiB，上传预留配额并限制读取；Go 对象写入专用临时目录，Worker 对象在内存中。它们是本地资源保护值，不是实际 Provider 限制。浏览器下载当前有界 mock 文件使用 Blob，真实大文件需在下一阶段确认流式下载方案。

D1 Repository、S3 直传与完成核验、真实管理员初始化、Native 配置热更新以及真实部署脚本尚未实现。真实存储 SDK Adapter 已实现，但尚未组装为生产运行入口；默认服务只支持 mock，SDK 配置错误不会静默回落到 mock。JWT 无刷新 Token、无黑名单，退出只清除浏览器状态，已经签发的 Token 到期前仍有效。

下一阶段需配置 D1 与相应 Provider Secrets，再分别验收流式读写、平台限制、限流/超时、远端删除失败补偿、并发条件更新与生产入口隔离。[工程 Spec](docs/specs/foundation.md) 保留了需要单独确认的 S3 直传契约取舍。
