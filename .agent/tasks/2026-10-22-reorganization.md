# 最新规则下的项目重组

开始：2026-10-22；更新：2026-10-23，Asia/Shanghai。

## 目标与授权

用户要求读取最新规则文档和 agent.md，重新组织本项目全部代码与目录。已读取本机 `/home/helan/.codex/AGENTS.md` 及适用 Go 架构、数据访问、HTTP、注释、实施验证、通用注释、Git 安全、运行环境、前端与交接专题。项目原无 AGENTS.md，旧 Spec 明确保留 DDD 五层且引用已替换的全局 development-standards.md；本轮按最新要求迁移业务模块结构。

## 设计与边界

- Go：同一业务模块收拢 Handler、Service、Repository 接口、模型与规则；app 管组装/生命周期、server 管路由、config 管加载、infra 管外部与内存实现。去除 Biz 与五层目录。
- Worker：同样按 file/storage/identity/auth 收拢业务，保留 Hono/Web 运行时惯例；同步修改 test-support imports。
- 内存仓储继续共享状态，Go 保留同锁原子引用检查；不能拆成互不协调的存储。跨模块业务能力由 Service 提供。
- React：将实例查询/Provider 展示、系统查询归对应 features；保留既有布局、DOM、动效及 API 行为。8 个浏览器片段归 tests/browser。
- 补项目 AGENTS，更新当前架构与入口文档；历史验收不冒充本轮结果。
- 保留现有 OpenAPI 外壳特例、默认 mock、SDK 手动启用与 Secret 引用。无依赖升级、真实 Provider/D1 联调、部署或 Git 写操作。

## 环境与备份

真实路径 `/home/helan/own/FluxVault`，无 Git 元数据。Linux x86_64、Bash、Go 1.27.1-X:nodwarf5、Node 24.20.0、npm 11.19.0、Python 3.14.8；现有依赖足够，无需安装或修改全局环境。

源码及设计材料备份：`/tmp/fluxvault-reorganization-knqrzon1/before.tar.gz`；SHA-256 清单：同目录 `manifest.json`，共 221 个文件。排除 node_modules、构建缓存、本地状态、IDE、日志及 `.dev.vars` / `.env`；这些文件不在改动范围。

## 状态

已完成。Go、Worker、React 和浏览器片段的重组、项目 AGENTS 与当前架构/SDK/启动文档同步、集成验证和最终复核均完成。旧五层目录与引用清零；无本轮未解决事项。

Go：modules/{file,storage,identity,auth}，app 显式构造和生命周期，server 统一路由，config、middleware、httpx、infra 各自归属。Repository 接口归模块，私有内存实现继续共用同锁。身份生命周期测试归 identity，新增共享引用/能力复查/并发竞争回归。

Worker：modules/app/server/httpx/infra 重组完成；业务模块不反向依赖组装或基础设施，文件服务经实例服务的最小能力访问。独立审查确认认证顺序、DTO、文件状态、共享 Map 与入口缓存保持原行为。

React：实例查询/展示及系统查询归对应功能；8 个浏览器片段移入 tests/browser，补执行前提。未改变 JSX、样式、布局或动效。

## 最终验证

- Go fmt/vet/build 全部通过；race 20 个顶层测试 PASS、真实 S3 1 SKIP，无 race 报告。新增测试包括 100 轮建文件/删实例竞争。
- Worker lint/typecheck/18 项测试/dry-run 通过；隔离 workerd SDK 9 场景通过。
- Web lint/typecheck/2 项测试/build 通过；保留原有约 538 kB 主 chunk 提示。
- 根 Prettier、OpenAPI lint/类型重新生成、SQL 语法/约束检查、双端完整黑盒契约均通过。
- Go 63 个源文件依赖边界、导出声明 GoDoc/唯一包说明检查通过；Worker 49 个生产文件、142 条相对 import 可解析且无环。
- 当前文档相对链接检查通过；15 个契约/生成类型/锁文件/迁移/CSS/原型文件哈希与备份一致；未发现范围外修改。
- 浏览器片段 node --check 通过且内容逐字未改；相关 React hook/页面函数体与备份一致。

详细证明范围见 docs/specs/verification.md 的 2026-10-23 章节。未执行浏览器视觉复验、真实 Provider/D1、部署或远程 CI。无 Git 写操作，无依赖升级，无系统配置修改；源码备份继续保留在上述项目外目录。
