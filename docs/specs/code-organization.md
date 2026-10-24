# 当前代码组织

更新日期：2026-10-24。依据本轮用户要求以及最新全局 AGENTS 和 Go 专题，将此前五层目录整理为业务模块。项目入口为 [AGENTS.md](../../AGENTS.md)；业务约束见 [工程基础](foundation.md)。本文记录当前组织和项目例外，不复制全局规则。

## 顶层职责

| 路径 | 内容 |
| --- | --- |
| `apps/server-go` | Native Go 服务，Gin 提供独立 Public/Admin 监听入口 |
| `apps/worker-ts` | Hono Worker 服务，运行环境与 Go 独立 |
| `apps/web` | React 管理台，按功能组织页面、交互和查询 |
| `contracts` | OpenAPI 契约及共享 Schema，生成类型不手工编辑 |
| `database/migrations` | D1 SQL 迁移，不存储文件正文 |
| `config` | 跨后端 Secret 格式示例，不自动启用真实服务 |
| `scripts` | OpenAPI 类型生成 |
| `design/prototype` | 已审查的交互原型 |
| `.agent/tasks` | 独立任务状态；历史结果保留原日期与范围 |

## Go

```text
apps/server-go/
  cmd/server/main.go          参数与进程入口
  internal/
    app/                     显式依赖注入、mock 种子、SDK 工厂与生命周期
    config/                  启动配置加载与验证
    server/                  route.go 集中注册双入口，HTTP 超时与系统接口
    middleware/              管理员 JWT、API Key 与匿名下载认证链
    httpx/                   JSON 读取、查询基础校验、安全错误响应
    modules/
      file/                  Handler、Service、Repository、文件模型与状态规则
      storage/               Handler、Service、Repository、实例模型与能力规则
      identity/              Handler、Service、Repository、API Key 与身份规则
      auth/                  管理员登录 Handler、密码/JWT/限流 Service
    infra/
      memory/                私有共享存储、各 Repository 实现、临时正文存储
      providers/             SDK、Secret 校验、目标绑定与流处理
    fault/                   既有安全错误及 errors.Is/As 可识别类别
  pkg/pagination/            分页参数、边界及结果
```

每个业务模块是一个 Go 包，以文件表达职责，不建立独立 Biz、领域层和应用层。Handler 处理协议；Service 负责权限和流程；Repository 接口集中在模块的 `repo.go`。操作输入、响应和辅助逻辑靠近使用处，共享模型与常量只声明一次。

文件 Service 只持有自身 Repository、正文 ObjectStore 和实例服务的最小消费接口。`storage.Service` 为新上传校验实例启用状态和 private 能力，已有文件的下载/删除仍可读取停用实例。跨模块不传递任意写仓储能力。

当前唯一元数据实现是内存存储。`infra/memory` 的私有实现通过构造返回各模块 Repository 接口，三者共享同一份存储和锁：创建文件时复查实例能力，删除实例时检查文件引用，检查和修改在同一个临界区完成。这里保留集中实现以避免模块间的 import 环和引用竞态，不为每个模块增加空转发构造函数。

`app` 负责组装 Repository、对象存储、各 Service/Handler 和认证链，创建种子，并管理监听器、服务退出和临时文件释放。`server/route.go` 统一绑定 Public/Admin 路径及认证顺序。业务模块不反向依赖 app/server，也不直接引用 SDK。

## TypeScript Worker

```text
apps/worker-ts/
  src/
    index.ts                 Worker fetch 入口与运行实例缓存
    app/                     bindings、mock 组装、种子和停用的 SDK 启用示例
    server/                  Hono 根应用、两组 API 挂载与服务集合
    httpx/                   HTTPEnv、JSON/查询解析和共享基础校验
    modules/
      file/                  文件 service/repo/model/policy/handler/schema/dto
      storage/               实例服务、能力规则和协议适配
      identity/              密钥签发、认证、scope 与生命周期
      auth/                  登录、JWT 和认证中间件
    infra/
      memory/                共享 Map、同步引用检查及有界正文存储
      providers/             S3、GitHub、Telegram SDK 适配器
    fault.ts                 安全业务错误
```

Worker 保留 Hono、Zod 和 Web API 的惯用方式，模块按职责分文件，不复制 Go 的包内命名习惯或多层工厂。实体路由仅接收自身服务；公共 HTTP 类型与解析置于 `httpx`，不依赖根组装集合。文件服务仅取得实例服务的读取和上传校验能力。

内存实现仍共享一组 Map。实例检查到写入、引用检查到删除之间没有异步让出，保持单 isolate 内的原子语义；这不证明未来 D1 或多个 isolate 的一致性。Worker 默认入口和 bindings 保持稳定。

## React 与浏览器片段

保留 `app`（路由与外壳）、`features`（功能）、`components`（共享 UI）、`api`（客户端及生成类型）、`lib`（通用能力）。文件查询归 files，实例查询及 Provider 展示归 instances，系统查询归 settings，避免实例和设置反向依赖文件页面。缓存键、请求、页面布局、DOM、样式和动效保持原有行为。

2026-10-24 按用户要求删除全部测试源码、测试辅助入口和浏览器测试产物；此前验证仍按原日期保留在验证记录中。

## 契约与运行边界

现有 OpenAPI 优先于全局默认响应外壳：成功返回契约 JSON，失败返回字符串 `error.code`、安全 `message` 及可选 `file_id`；下载保留流，204 不写正文。`fault` 继续保存既有安全协议详情，Go 使用 `errors.Is/As` 分类。本轮不更换错误体系或改业务码。

Public/Admin 路径、认证隔离、JWT 策略、8 MiB 代理上传限制、pending/ready/deleting 恢复语义、Secret 引用与 SDK 目标绑定保持原契约。默认运行 mock，真实 SDK 保持可编译但不自动启用；没有 D1 实现、依赖升级或部署。

实际验证见 [验证记录](verification.md)，本轮任务与备份信息见 [任务文件](../../.agent/tasks/2026-10-22-reorganization.md)。
