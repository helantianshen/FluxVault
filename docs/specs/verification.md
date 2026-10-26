> 2026-10-24：测试源码、测试脚本及浏览器产物已按用户要求清理。下文保留历史验证事实，旧路径和命令仅为历史记录，不是当前执行入口。

# 首阶段本地验证记录

日期：2026-10-18，Linux x86_64。本记录属于本地 mock 验证，不是 D1、真实存储、部署或远程 CI 验收。

## 自动检查

| 检查 | 结果 | 证明范围 |
| --- | --- | --- |
| Go fmt / vet / build | 通过 | 当前 Linux 工程可构建 |
| Go test -race | 通过，8 个用例 | 失败记录、元数据清理失败重试、状态条件更新、TG 删除、限额、Key 生命周期 |
| Worker ESLint / tsc / Vitest | 通过，8 个用例 | 同等领域不变量；本地实现 |
| Worker bundle | dry-run 通过 | 打包成功，未部署 |
| Web ESLint / tsc / Vitest | 通过，2 个用例 | 认证头、401 清理与错误记录 ID |
| Web Vite build | 通过 | 指定管理 API 地址生成静态产物 |
| OpenAPI lint / 类型生成 | 通过 | 两份契约与派生 TS 类型 |
| 双后端黑盒契约 | 通过 | 同一组请求分别在隔离 Go / workerd 执行并校验响应 Schema |
| SQL Migration | 通过 | Python SQLite 内存库的语法、单管理员、外键、状态和归属约束 |
| Prettier | 通过 | 已覆盖源文件格式 |

构建仍有一项前端体积提示：主 JS chunk 约 538 kB（gzip 约 167 kB），超过 Vite 默认 500 kB 提示阈值。功能页已按路由拆分；本轮没有用提高阈值隐藏提示。Worker 在当前机器检测到代理环境变量，dry-run 不连接产品存储。

契约场景包括错误登录、认证隔离、API Key scope/归属、public 匿名下载、private 隐藏、重复查询参数、上传字节内容、实例禁用、GitHub private 拒绝、Direct 422、密钥轮换/禁用/撤销、文件及实例删除。具体可复现入口为 `npm run test:contract`。

## 浏览器与视觉

使用 Playwright CLI 和本地 React 构建产物，管理 API 指向 Go 18081。Worker HTTP 行为由上述同组契约独立验证；没有将其描述为另一次完整浏览器验收。

- 桌面 1440×1000：文件选择、pending 下载禁用、空搜索、GitHub private 校验、实际上传/下载/删除。
- 实例创建、启停、重命名、删除；API Key 创建、原文关闭后消失、启停、轮换与永久撤销；系统信息。
- 移动 390×844：无页面横向溢出，关闭导航不可聚焦，导航切换、详情抽屉、Escape 关闭、上传弹窗。
- 实测普通模式存在对话框动画，减少动态效果模式取消 CSS 入场；刷新回到登录，localStorage/sessionStorage 不存储凭据。
- 独立设计复核的四项修正已通过定向浏览器检查：空结果一键重置所有筛选；真实后端 Key 到期后显示灰色“已过期”；禁用状态文字与背景对比度 4.76:1；移动导航打开后主动聚焦，Tab/Shift+Tab 留在侧栏，背景 inert，Escape 关闭后焦点返回菜单按钮。
- 已打开截图检查实际渲染。截图位于 `.impeccable/review/react-*.png`，本地产物未纳入 Git；固定覆盖层在全页截图中只覆盖当前视口，画面视口外区域不代表浏览器中可透过遮罩操作。

该阶段浏览器脚本原位于 `scripts/check-web-{files,admin,mobile,review-fixes}.cjs`（2026-10-22 归档至 `tests/browser/web/`，文件名与内容不变），通过 `playwright-cli -s=fluxvault-web run-code --filename=...` 执行。它们要求本地演示服务与已登录浏览器，生成可删除的测试记录，不对线上环境运行。到期状态检查创建短期 Key 并等待实际到期，不替换后端响应或修改浏览器时间，检查后撤销该 Key。

开发期一次 UI 检查被 `tsc -b` 生成的缓存文件触发的 Vite 整页刷新打断。改用 `tsc --noEmit` 并使用构建产物复验后流程通过。该现象与内存 Token 在刷新后清除的约定一致，不是上传失败。

自动设计检测对 React 源码返回零条发现。它不等于可访问性认证、性能测量或全部终端视觉验收。用户批准的是原型；正式 React 的用户手工审查仍可继续反馈。

独立复核回看上述四项后均标记 resolved，剩余项 clear，结论 ship。该结论仅覆盖本批修正，不扩展为真实存储、全面可访问性或用户验收。最后一轮代码格式检查通过。

## 尚未验收

真实 D1 迁移和并发行为、真实 Provider 与文件大小限制、真实管理员初始化、S3 直传、公开/私有下载策略在实际平台的语义、部署、负载测试、其他浏览器/操作系统、远程 CI。

## SDK 接入追加验证

日期：2026-10-18。此节记录 [存储 SDK 适配器](provider-sdks.md) 的后续验证，上方首阶段结果保留为历史记录。Go 和 Worker 的真实适配器已实现并参与编译，默认启动仍使用 mock，只有启用组装示例保持注释。

| 检查 | 结果 | 证明范围 |
| --- | --- | --- |
| Go vet / test -race / build | 通过，12 项测试 | 原有 8 项应用测试与新增 4 组真实 SDK 测试 |
| Worker ESLint / tsc / Vitest | 通过，17 项测试 | 原有 8 项应用测试与新增 9 个 SDK 场景 |
| Worker bundle | dry-run 通过 | 默认 mock 入口可打包，未部署 |
| SDK workerd 验证 | 通过，9 个场景 | 真实 Worker 运行时执行同组 SDK 场景，未启用 Node compatibility |
| 双后端 mock 黑盒契约 | 通过 | 测试启动工具提取后，Go / Worker 原有业务闭环仍通过 |
| Prettier / 示例与链接 | 通过 | 源码格式、Secret 示例 JSON 与接入文档链接 |

SDK 验证使用本地 HTTP 服务或受控 transport/fetch，检查签名和认证、上传二进制、GitHub 200/302 下载及 CDN 不携带凭据、Telegram multipart/file_id 与仅删除元数据、目标绑定和凭据轮换、大小上限、取消、读取错误脱敏及失败记录。最后一次下载流取消错误脱敏修改后，Worker lint/typecheck、17 项测试、workerd 9 个场景与格式检查重新通过。

本轮未改 UI，未重复浏览器或视觉验收。已将 workerd SDK 验证加入 CI 配置，但未执行远程 CI。未连接真实 RustFS/MinIO、GitHub 仓库或 Telegram Bot；真实持久化、Provider 端到端行为及部署仍不在已验收范围内。

## 2026-10-21 编码规范与目录组织整理

用户确认 A 方案后保留 DDD 五层目录，当前映射见 [代码组织](code-organization.md)。本轮不升级依赖，不改变默认 mock，不接入真实账户。

| 检查 | 结果 | 证明范围 |
| --- | --- | --- |
| Go gofmt / vet / build | 通过 | 目录拆分与集中构造后的全部 Go 包可编译 |
| Go test -race | 通过，17 个顶层测试函数 | 原有 12 项及新配置边界、配置加载、错误包装、路由清单、分页边界检查；含表驱动子场景 |
| Go 源码 AST 检查 | 通过，60 个文件、169 个命名函数/方法 | 文件说明、每包唯一包说明、函数注释、注释结尾和生产代码依赖方向；不等于自动证明注释内容正确 |
| Worker ESLint / tsc / Vitest | 通过，17 项测试 | 私有仓储依赖和 Hono 实体模块拆分后的应用与 SDK 行为 |
| Worker bundle | dry-run 通过 | 打包成功，未部署；当前主包约 925.25 KiB，gzip 约 163.95 KiB |
| SDK workerd | 通过，9 个场景 | S3、GitHub、Telegram SDK 的隔离运行时回归 |
| 双端黑盒契约 | 通过，Go / Worker 各一套完整流程 | 路由、认证、权限、上传下载、删除、密钥生命周期与响应 Schema |
| Prettier / 文档链接 | 通过 | 既有格式覆盖范围及本轮更新文档的相对链接 |

新增分页测试曾因同作用域重复短变量声明导致编译检查失败，改为赋值后最终 vet、全量 race 和 build 均通过。最终分页实现改动后重新执行双端契约并通过。

已按控制流核对关键注释：pending/deleting 失败记录、共享仓储锁、临时文件释放、API Key 随机源与摘要、bcrypt/JWT、SDK 重定向与错误脱敏。API 请求方法与完整路径保留在 Go Handler 注释，路由清单测试覆盖 6 条 Public 和 16 条 Admin 注册。

React、样式、生成 API 类型、OpenAPI、迁移和依赖锁文件未修改；本轮未重复前端浏览器、视觉或构建验收。没有真实 Provider、D1、远程 CI 或部署验收。历史验证记录仍保留原日期范围。

## 2026-10-21 RustFS 真实 S3 实例联调

用户授权仅测试 S3，目标为 `http://72.249.206.203:9000`，桶 `fluxvault-test`。未提供 region，采用示例值 `us-east-1` 后两端签名请求均成功；该结果说明此配置可用，不推断服务端内部区域或版本。

| 检查 | Go AWS SDK v2 | TypeScript AWS SDK v3 / 本地 workerd |
| --- | --- | --- |
| 上传 65,537 字节合成二进制 | PUT 200 | PUT 200 |
| 下载并逐字节核对 | GET 200，完全一致 | GET 200，完全一致 |
| 删除本轮对象 | DELETE 204 | DELETE 204 |
| 删除后再读取 | GET 404 | GET 404 |

对象键为 `fluxvault-sdk-test/57b302d2-f354-4ba5-aaa9-1a15856b9592/go-binary` 和 `fluxvault-sdk-test/c9f71ec5-4138-49e0-bdb1-5e6af7d345c9/worker-binary`。仅操作这两个唯一键，没有列举、修改或删除其他文件。404 确认当前键不可读取；未查询桶版本控制状态或历史版本。

真实测试调用现有 Provider 适配器，没有替换响应或模拟网络。Worker 运行于隔离的本地 workerd，未启用 Node compatibility，未部署到 Cloudflare。复现方法见 [SDK 联调入口](provider-sdks.md#显式真实-s3-联调)。

新增 Go Provider 测试包回归及 vet 通过；Worker typecheck、ESLint 和新增 TS/MJS 文件 Prettier 检查通过。首次 ESLint 检查发现测试变量初始化冗余，移除该初始化后静态检查通过；未改业务适配器。受限临时凭据文件已删除，项目文件扫描未发现该 Secret 原文，隔离 Worker 由脚本收尾清理。

默认应用仍为 mock。本轮未验证 D1、业务 API 与真实存储的完整持久化闭环、Cloudflare 生产出网、MinIO 实例、GitHub/TG、8 MiB 边界、并发及负载、版本控制或部署；不能将此结果推广到这些范围。测试使用 HTTP，生产连接仍应配置 HTTPS。


## 2026-10-23 最新规则下的业务模块重组

本轮从 2026-10-22 开始，按最新全局 AGENTS 与专题规则迁移为业务模块；实施结果见 [代码组织](code-organization.md)，备份与执行状态见 [任务文件](../../.agent/tasks/2026-10-22-reorganization.md)。本节仅记录此次本地验证，不改写上方历史验收。

| 检查 | 结果 | 证明范围 |
| --- | --- | --- |
| Go gofmt / vet / build | 通过 | 63 个 Go 源文件，包含薄 main、app 生命周期、模块 Handler/Service/Repository 与基础设施 |
| Go `env -u FLUXVAULT_S3_TEST_CONFIG go test -race -count=1 -v ./...` | 20 个顶层测试通过，真实 S3 用例 1 项跳过，无 race 报告 | 原有状态/权限/SDK/配置/路由/分页回归；新增 3 组共享仓储约束测试 |
| Go 仓储并发回归 | 通过 | 文件引用阻止删除实例、清理引用后允许删除；上传校验后禁用实例的持久化复查；100 轮并发创建文件/删除实例不产生悬空引用 |
| Go 依赖与声明审查 | 通过 | 模块不反向引用 app/server/infra；Service/Repository/Model/Policy 不引用 Gin/httpx/middleware；导出声明 GoDoc、每包唯一 Package 说明齐备 |
| Worker lint / typecheck / Vitest | 通过，18 项 | 迁移后的文件、身份与 SDK 行为；新增停用实例拒绝新上传但保留已有文件读删检查 |
| Worker build | dry-run 通过 | 默认 mock 可打包，未部署 |
| 隔离 workerd SDK | 通过，9 场景 | 本地受控 transport/fetch，未连接真实 Provider |
| Web lint / typecheck / Vitest / build | 通过，2 项测试 | 查询及 Provider 展示的归属调整后可编译运行；构建指定本地管理 API |
| 双后端黑盒契约 | Go / Worker 各 1 套完整场景通过 | 认证隔离、scope/所有权、上传下载、实例约束、删除与密钥生命周期，以及 OpenAPI 响应校验 |
| OpenAPI lint / 类型重新生成 | 通过 | 生成的 schema.d.ts 与修改前逐字一致 |
| SQL Migration | 通过 | 本地 SQLite 校验语法与约束，不代表 D1 验收 |
| Prettier / 浏览器片段语法 / 文档链接 | 通过 | 根既有格式覆盖范围、8 个移动后的 CLI 片段语法、当前说明的相对链接 |

Worker 独立审查比对修改前备份：96 个 TypeScript 声明 AST 等价，8 个预期组装/路由/服务声明变化已逐项核对；49 个生产 TS 文件的 142 条相对 import 可解析，含 type import 的依赖图无环。共享 MemoryState、各内存实现与 Worker 入口除 import 外保持原文，保留同步引用检查、运行实例缓存及初始化失败清空行为。认证链和安全 DTO 未改变。

React 的三个查询 hook、ProviderLabel 和相关页面函数体与备份一致；8 个浏览器片段内容不变，仅移动至 tests/browser。15 个受保护文件（契约、生成类型、依赖锁、Go 模块声明、SQL、样式和原型）哈希一致，没有依赖升级或接口迁移。旧五层目录与生产 import 已清除，当前路径与 SDK 显式联调命令已同步。

Web 构建仍保留原有主 chunk 约 538 kB 的体积提示，未调整阈值。本轮没有重新执行浏览器渲染或视觉验收；没有真实 Provider、D1、Cloudflare 部署或远程 CI 验收。默认仍为 mock，未执行 Git 写操作，未改动本地真实配置或既有演示进程。

## 2026-10-23 下载断流与删除分页修复

依据链路审查结果，仅修改 Go 下载复制结果检查、保留标准 HTTP 中止信号的 Gin 恢复包装，以及 Web 越界页校正。接口、成功响应和界面样式保持原状；具体边界和证据见 [修复任务](../../.agent/tasks/2026-10-23-chain-fixes.md)。

- 新增真实 HTTP/1.1、HTTP/2 下载回归，共 20 个传输场景和 1 项普通 panic 检查；修复前 overlay 的 14 个错误传输场景失败，修复后通过。
- Go 全量 test -race、vet、build，Web lint/typecheck/2 项 Vitest/build，根 format:check 和 Go/Worker 双端黑盒契约均通过。真实 S3 环境变量已移除，未执行真实联调。
- 隔离 mock 上通过 Playwright 实际验证有效页保留、越界回退到末页、移动详情关闭和删至空列表；新增可重跑的 分页片段（历史路径：`../../tests/browser/web/check-file-pagination.cjs`）。已查看桌面及移动视口截图，页面无横向溢出、控制台无 error/warning；不是物理移动设备验收。
- 既有 Web chunk 体积提示保留；无真实 Provider、D1、远程 CI 或部署验收。

## 2026-10-24 测试清理与首次入库

按用户要求清理 Go/TS 单元测试、契约测试、浏览器检查、SDK/workerd/S3 联调脚本与测试产物；移除测试专用 npm 依赖及 CI 入口，保留生产源码、mock 种子、OpenAPI、迁移、原型及历史记录。删除前备份位于项目外，不入库。

本轮 Go vet/build、Web 与 Worker lint/typecheck/build、根格式检查、OpenAPI lint/类型生成均通过，生成类型与清理前一致。Worker 仅 dry-run；没有测试文件，因此这些结果属于静态和构建验证，不宣称回归测试或部署验收。保留的锁文件依赖版本未升级。

## 2026-10-24 D1 接入本地验证

默认 mock 保留；新增 Go REST 仓储、Worker DB 绑定仓储及持久化管理员初始化。配置模板和被 Git 忽略的本机占位副本已创建，尚未填写真实凭据。

- Go build / vet 通过。项目外临时 overlay 验证在 `-race` 下通过，覆盖实际本地 D1 SQL 的 CRUD、分页、跨端 JSON/时间解码、条件状态转换、撤销终态、并发实例删除与建记录的外键保护，以及 REST 错误脱敏。Go REST 被限定转发到隔离本地 workerd，未访问 Cloudflare REST。
- Worker lint / typecheck、默认配置 dry-run build，Web lint / build，OpenAPI lint / 类型生成及 Prettier 检查通过。保留既有 Web 主 chunk 超过 500 kB 的构建提示。
- Worker 使用项目外 Miniflare/workerd 的原生 D1 绑定，应用两份实际迁移；验证 Unicode 和字面名称搜索、空页总数、禁用实例检查、pending/ready/deleting 及撤销终态。完整停止并重新启动 workerd 后，文件仍可查询，旧管理员密码有效，新启动配置中的不同密码没有覆盖已保存摘要。
- Go 显式 D1 组装入口使用同一临时数据库，通过管理员登录及文件/实例/密钥/系统信息接口；重建组装且清空初始化密码后仍可登录；安全 DTO 未泄露摘要和对象定位。
- Playwright 使用隔离前端和本地 D1，实际查看桌面及 390×844 视口截图：设置页显示 D1 模式，文件页不显示 mock 清空提示；移动端无横向溢出，浏览器控制台无 error/warning。源码 UI 检测器未报告问题，但该扫描不包含渲染后的对比度规则。

未新增仓库测试文件或依赖；临时验收工具位于项目外。以上不是远程 D1、真实 Provider、生产部署或远程 CI 验收，也不是完整业务回归。

## 2026-10-26：公开直链与 Worker 正文缓存

- 管理台按 `VITE_PUBLIC_API_URL` 和文件 ID 生成既有 Public 下载地址，仅 public/ready 文件可复制；移动端上传完成后打开详情。上传 JSON 契约和 Go 后端未修改。
- Worker 在 D1 模式下仅缓存 Public 入口的公开正文；权限和状态校验发生在缓存查询之前。内部 TTL 为 1 小时，客户端保持 no-store，缓存异常回退代理；不增加图片预览、Range 或私有签名分享。
- Worker/Web lint、typecheck、build（Worker 仅 dry-run），根 format:check、contracts:lint、contracts:types 和 git diff --check 通过。Web 构建仍有大于 500 kB chunk 的提示。
- 定向检查源码为 `apps/worker-ts/scripts/check-public-download.ts`，执行命令见 README。使用真实路由/Service、内存仓储和模拟 Cache API，覆盖命中避免回源、无效凭据、private/admin 绕过缓存、deleting/deleted 拒绝旧缓存及缓存异常回退；不等同于边缘网络验收。
- Playwright 在本机 Worker mock 上验证复制链接与匿名下载、移动端公开上传后展示直链及下载字节一致性。已查看 1440×1000 和 390×844 截图，未见该区域布局溢出；Impeccable 检测未报告问题。
- 未部署、未提交或推送，未执行真实 Telegram/D1 联调、Cloudflare 多节点缓存验收。临时本地服务已停止。
