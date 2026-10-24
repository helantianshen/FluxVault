# 开发规范与组织整理

日期：2026-10-21，Asia/Shanghai。

## 授权与决定

用户要求按新全局开发规范整理本项目，并已选择 A：保留 domain/application/infrastructure/transport/bootstrap 五层，落实新编码与组织规范。个人项目，实际路径 /home/helan/own/FluxVault，无项目 AGENTS，未初始化 Git。本地 Linux x86_64、Bash、Go 1.27.1、Node 24.20.0，未发现容器或 SSH 标志。

## 实施范围

- Go：文件/包/函数中文说明、关键流程和库约束；application 集中构造与明确 Biz/Repo 依赖；HTTP 按实体分文件，DTO 就近放置，路由统一到 route.go；配置加载与 Validate 分离；固定错误集中定义与 errors.Is/As；保持领域模型与行为分离
- Worker：保留 Hono 与 DDD 组织，明确仓储依赖、消除 transport 直接访问仓储、补充所改代码用途与关键流程说明
- React：保留现有 feature/component/API/state 结构及已认可视觉和动效；本轮不做界面改版
- 保留 mock 默认、真实 SDK 停用、现有 API/认证/错误协议、文件状态与资源释放语义；不接入 D1、不升级依赖、不部署、不执行 Git 写操作

## 现状与风险

Go 原有 37 个手写文件、142 个命名函数/方法。api.go 混合路由与中间件，admin.go 混合多个实体处理；Handler 通过公开 Repo 字段绕过 application；配置加载内混入校验。改造需要回归路由、认证链、失败记录与生命周期，不能只通过编译宣称行为一致。

## 验证计划

Go gofmt/vet/test-race/build；Worker lint/typecheck/test/dry-run；真实 SDK workerd 场景；双端黑盒契约；格式与依赖边界检查。增加必要的路由清单、配置校验及错误识别检查。没有修改 UI 时不重复视觉验收，也不宣称本轮通过浏览器验收。

## 状态

已完成实施、说明同步和最终验证。当前目录说明：docs/specs/code-organization.md；README 与 foundation 已链接当前说明，verification 追加本轮记录，保留历史结果。

修改前备份：`/tmp/fluxvault-standards-8kw4qx6p/before.tar.gz`。不是 Git 仓库，没有执行 Git 写操作。原 admin.go 和 api.go 的职责已移动至实体处理、handler、route、http、auth 等文件；无业务接口删除。

完成项：Go 三个 Biz 与层内集中构造、私有仓储依赖、DTO 就近与安全转换、HTTP 路由统一注册、服务配置从 main 提取、配置 Validate、Provider 各配置校验、模块固定错误及错误类别识别、pkg/pagination、中文文件/包/函数及关键步骤说明。Worker 保留构造函数注入，仓储依赖私有并按实体拆 Hono 管理路由。React 未改动。

实际验证：Go vet/test-race/build 通过，共 17 个顶层测试函数；Worker lint/typecheck/17 项测试/dry-run 通过；真实 workerd 9 场景通过；双端黑盒契约通过；Prettier 与文档链接检查通过。临时 AST 审核脚本 /tmp/audit-fluxvault.go 检查 60 个 Go 文件和 169 个命名函数/方法，通过文件/包/函数说明、注释结尾与生产依赖方向检查。注释事实另按真实控制流核对。

一次新增分页测试编译问题已修正，最终全量 Go 校验与分页改动后的双端契约均通过。无剩余本轮阻塞或待用户决定事项。真实 D1/Provider、部署、远程 CI 仍属于后续范围；本轮未重新执行 React 构建或浏览器视觉验收。
