# FluxVault

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

需求文档指定 Vite、React、TypeScript、Tailwind CSS 4、shadcn/ui、React Router Declarative Mode、TanStack Query、Motion、Lucide 和 Vitest。Go Native 使用 Gin，TypeScript Worker 使用 Hono。原型使用 HTML、CSS 和少量 JavaScript，原型已获认可，React 管理台按该基准实现。

## Users

单管理员维护文件、存储实例和 API Key。外部程序通过 Public API 使用文件托管服务，V1 不提供普通用户 Web 界面。

## Product Purpose

以稳定的系统文件标识统一管理 Telegram、GitHub Releases 和 S3 兼容存储实例，提供受权限和可见性约束的上传、下载、删除能力。

## Operating Context

用户于 2026-10-18 确认本阶段使用 mock 完成双后端闭环，真实 D1 与存储服务下一阶段单独验收。一个部署只运行一种后端。管理员凭据通过独立初始化流程配置；管理员 JWT 有效 12 小时，页面只在内存保留 Token，刷新后重新登录。

## Capabilities and Constraints

文件区分 pending、ready、deleting；公开文件可匿名下载，私有文件受所有权约束。Telegram 删除只移除元数据。API Key 可以轮换、禁用、恢复、撤销，密钥原文仅展示一次。存储实例保存 Secret 名称，真实凭据由部署环境提供。

## Brand Commitments

项目目录名称为 FluxVault。2026-10-18 用户确认参考 RustFS Console 类管理台，以文件列表为中心，右侧查看详情。侧栏包含文件、存储实例、API Key、系统设置。用户已审查并认可该原型，同时要求适度增加切换和点击反馈。

## Evidence on Hand

来源：用户提供的《多存储源文件托管服务 V1 需求与技术方案草案》（2026-10-16）及 2026-10-18 本轮确认。界面数据均为演示数据，不表示真实云服务已连接或真实文件已经上传。

## Product Principles

- 对外契约和业务规则在两套独立后端中保持一致。
- 先保证文件状态与权限正确，再优化接入体验。
- 管理员可以理解失败状态并执行明确操作。
- 原型、mock 验证和真实云服务验收分别记录。
