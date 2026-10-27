# V1 工程基础与首阶段范围

状态：根据 2026-10-16 需求草案与 2026-10-18 用户确认实施。接口细节以 contracts 中两份 OpenAPI 为准。本文记录架构、边界和验收，不复制接口文档。

## 已确认范围

本阶段实现 Go Native 与 TS/Hono Worker 的本地 mock 业务闭环。两端独立构建、独立运行，共享 OpenAPI 与 D1 SQL Migration。真实 D1、Telegram、GitHub Releases、S3 接入属于下一阶段，不将 mock 验证描述为线上验收。

2026-10-24 增补：已实现显式 D1 仓储和持久化管理员初始化；默认 mock 不变，远程连接、迁移及部署待单独验收，当前配置见 [D1 接入](d1.md)。以下保留首阶段设计背景。

后续 SDK 接入范围已获用户单独授权：真实对象适配器正常编译与测试，启用示例保持注释，默认仍运行 mock。实现与配置边界见 [存储 SDK 适配器](provider-sdks.md)；真实账户连接与 D1 持久化仍待单独验收。

前端已先交付可交互原型及桌面、移动截图。用户已确认视觉并授权 React 实现与适度动效。布局以文件列表为中心，右侧查看详情，参考 RustFS Console 类管理台；不增加无意义的总览数字和营销页面。

实例只保存 Secret 引用，不保存凭据原文。JWT 默认有效 12 小时。2026-10-27 按用户要求，前端在当前标签页的 sessionStorage 保留未过期会话以支持刷新；退出、到期或 401 时清除前端认证；签出的 JWT 在到期前仍有效，这是无黑名单方案的已知语义。

## 模块与依赖

2026-10-22 按最新规则整理为按业务模块组织的单体；两种后端独立实现相同规则。当前文件映射见 [代码组织](code-organization.md)，项目专属约束见 [AGENTS.md](../../AGENTS.md)。

| 责任 | 内容 | 依赖约束 |
| --- | --- | --- |
| modules/file | 文件模型、状态、上传下载删除 Service、Repository 接口及 Handler | 经 storage Service 查询实例能力；不引用 SDK |
| modules/storage | Provider/Instance 模型、实例管理及上传能力校验 | 不反向依赖文件业务；引用约束由共享仓储原子维护 |
| modules/identity | API Key、Principal、scope 与密钥生命周期 | 不依赖文件/实例业务 |
| modules/auth | 管理员密码、JWT、登录及认证 | 与 API Key 入口分开 |
| infra | 共享内存 Repository、mock ObjectStore、真实 Provider SDK | 实现业务端口，不决定业务权限 |
| server / 协议辅助 | 路由、公共 HTTP 校验、安全错误映射与中间件 | Handler 调用 Service，禁止直接读写 Repository |
| app / config | 显式组装、运行实现选择、生命周期与配置加载 | 不承载跨模块业务流程 |

Go 每个业务模块是一个包，按 Handler、Service、Repository 接口、模型、错误及具体操作分文件；不设置独立 Biz。Worker 使用相同业务归属，保留 Hono 模块路由和 Web API。不存在持久化职责的模块不建立空 Repository。当前内存实现集中保留共享状态，防止上传建记录与删除实例产生检查后执行的竞态。

不引入通用 CRUD 基类、事件总线、CQRS 框架、DI 容器、ORM 或分布式事务。使用现有 Gin、Viper、JWT、Hono、Zod、JOSE 等库处理通用能力，依赖版本不因结构整理调整。

普通 JSON 继续遵循本项目 OpenAPI 的成功对象和字符串错误代码格式；目录重组不适用全局默认整数响应外壳迁移。下载、204 及既有认证头保持协议语义。

## 业务边界

- 文件模块拥有文件状态、归属、可见性和远端定位。上传先保存 pending，再调用存储，最后条件更新 ready；失败保留 pending 和安全的错误代码。
- 存储模块拥有 Provider、Instance 和访问策略。公开 GitHub Releases 实例拒绝 private。被文件引用的实例不能移除；禁用实例拒绝新上传，已存在文件仍可读和删除。
- 身份模块拥有管理员、API Key 状态与 scope。密钥由 CSPRNG 生成，保存 SHA-256 哈希；管理员密码使用 bcrypt。API Key 的随机性使快速摘要适用，密码不能采用同样策略。
- Public 与 Admin 使用不同认证入口。Public Key 不能访问 Admin；Admin JWT 不能冒充 Public Key。public 文件的匿名下载不依赖公开列举能力。
- 对无权访问的私有文件返回与不存在一致的错误。文件状态不是 ready 时不提供内容。
- Telegram 删除仅清除元数据；GitHub/S3 先删远端再清记录。远端失败保留 deleting 及定位，允许再次请求删除。

## 直传设计需单独确认

草案要求核心 Adapter 只有 Upload、Download、Delete，同时要求 S3 直传签名和完成核验。保留核心接口，另用可选的 DirectUpload 能力承载“签发授权、核验完成”，避免要求 Telegram/GitHub 提供无意义方法。此阶段 mock 先验证代理上传与下载模式；不模拟未核验的 S3 直传成功，下一阶段在接入真实 S3 时冻结此专项契约。

## mock 与生产的隔离

mock 采用进程内元数据和有界对象存储，不将 SQLite 作为产品数据库。Go 与 Worker 的数据互不共享，重启丢失。每个 mock 文件最多 8 MiB、对象总量最多 32 MiB，仅为本地演示资源限制，不是生产 Provider 限制。读取请求按块处理，超过限额明确拒绝，避免无限读取。生产配置不能静默回退至 mock。

两端存储实例种子保持相同标识，文件种子覆盖相同场景，实际上传文件 ID 各自生成。可以通过仅限测试组装的故障注入模拟上传失败、远端删除失败、元数据确认失败；不开放可被远程触发的故障控制接口。

## 历史验收范围

以下为首阶段验收范围；2026-10-24 已清理测试源码及入口，当前可执行检查见 README，历史结果见验证记录。

1. Go fmt/vet/test（含 race）/build；Worker lint/typecheck/test/build。
2. 使用同一组黑盒场景运行两个服务，核对管理员认证、Key scope/归属、默认 private、上传字节内容、匿名 public 下载、Direct 不支持错误、文件删除和密钥生命周期。
3. 单元测试补足 pending/deleting 失败保留、撤销终态、过期、公开 GitHub 拒绝 private 等不变量。
4. OpenAPI 3.1 lint 与响应 schema 校验；迁移在隔离 SQLite 校验器运行，仅证明 SQL 语法与约束，不表示 D1 已验收。
5. 原型使用 Playwright CLI 验证桌面、移动布局以及筛选、详情、上传交互。视觉确认与技术验证分开记录。

## 实施依据

2026-10-18 查阅官方文档：

- [D1 prepared statements 和 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)：使用参数绑定，batch 的顺序与失败回滚语义供真实 Repository 实现参考。
- [D1 平台限制](https://developers.cloudflare.com/d1/platform/limits/)：查询与行大小有限制，文件正文不得存入 D1；分页与查询次数需要在接入阶段验证。
- [Telegram Bot API](https://core.telegram.org/bots/api#getfile)：官方托管 Bot 的取回限制需要与上传策略配套核验；含 Token 的下载地址不能暴露。
- [GitHub Releases Assets API](https://docs.github.com/en/rest/releases/assets)：只实现 Release Asset 的官方上传、读取与删除接口。


实现与验证进度见 [本地验证记录](verification.md)，启动方式见 [README](../../README.md)。

2026-10-21 曾保留 DDD 五层；2026-10-22 的最新规则重组取代该目录安排。历史阶段的验证范围仍以对应日期记录为准。
