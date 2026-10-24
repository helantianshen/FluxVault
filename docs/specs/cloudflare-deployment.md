# Cloudflare 部署

2026-10-24 用户授权部署 Worker 与 Cloudflare Pages，复用远程 D1 `test`。不操作根域名，也不覆盖现有 `k-vault` 项目的部署。

## 已部署资源

- Worker：`fluxvault-api`，配置为 `apps/worker-ts/wrangler.production.jsonc`
- 管理入口：`https://vault-admin.gyvv.top`，只接受 `/admin/v1` 路径和 `/healthz`
- Public 入口：`https://vault-api.gyvv.top`，只接受 `/api/v1` 路径和 `/healthz`
- Pages：`fluxvault-console`，通过 Direct Upload 发布 `apps/web/dist`
- D1：`test`；0001/0002 已在远程完成迁移，已有管理员，不重复初始化

Worker 通过 Secret 保存 `JWT_SECRET` 和 Telegram 配置 `TG_ARCHIVE`；不上传 Go 的 D1 API Token 或管理员初始化密码。`workers_dev`、预览 URL 均关闭。域名限制在数据库初始化和 CORS 之前执行，未知主机及交叉 API 路径返回 404；未配置域名的 D1 本地调试仍仅允许回环主机。

## 当前域名与验收状态

用户确认保留旧站 `vault.gyvv.top`（`k-vault`），FluxVault 前端使用 `https://fluxvault.gyvv.top`。Pages 已添加新自定义域名，Worker `ALLOWED_ORIGIN` 已更新并重新部署。用户已添加 `fluxvault` → `fluxvault-console.pages.dev` 的 CNAME。Cloudflare 已确认域名、verification 和证书 validation 均 active。直连正式域名 HTTPS 返回 200；首页标题、JS/CSS 与本地部署产物哈希匹配，`/settings` 返回同一应用入口和资源。当前 OAuth 没有 DNS 权限，未操作旧站记录。

用户调整 API 挑战规则后，线上管理员登录和 system/files/instances/keys 均返回 200，系统报告 `worker-ts` / `d1`。交叉入口返回 404，Public API 未认证返回 401。新前端 Origin 的预检通过，旧站 Origin 不获准。Pages 默认域名首页返回 200 和预期 HTML。Python HTTP 客户端仍可能收到 Cloudflare 1010，curl 实际请求成功，不能将此客户端差异归因为应用故障。

内置浏览器访问正式域名仍报 ERR_CONNECTION_CLOSED；本机代理线路同样 TLS 失败，但仅对验证请求不使用代理后 HTTPS 和资源校验成功。尚未实际渲染新域名页面，也未声称完整浏览器交互验收。Telegram Token 与私聊目标已校验，`Telegram 归档` 实例已创建并启用；尚未执行独立的上传下载验收。

## 后续发布

从仓库根目录执行 Worker 静态检查，然后发布：

```bash
npm --prefix apps/worker-ts run lint
npm --prefix apps/worker-ts run typecheck
(cd apps/worker-ts && npx wrangler deploy --config wrangler.production.jsonc)
```

已有 Secret 在正常发布中保留；需要更换时使用 Wrangler Secret 命令，不把原文写入配置或脚本。

前端构建与上传：

```bash
VITE_ADMIN_API_URL=https://vault-admin.gyvv.top npm --prefix apps/web run build
(cd apps/web && ../worker-ts/node_modules/.bin/wrangler pages deploy dist --project-name fluxvault-console --branch main --commit-dirty=true)
```

仅上传 `dist`。`public/_redirects` 提供 SPA 路由回退；最终前端域名必须与 Worker 的 `ALLOWED_ORIGIN` 完全一致。当前 Wrangler 对新项目可能自动委托 Workers 托管；本项目首次创建时明确使用 `pages project create ... --force` 保留 Pages，现有 Pages 项目后续直接发布。

## 本轮验证

Worker lint、typecheck、dry-run、入口隔离临时检查，Web lint/build，以及根 format:check 通过。前端产物已检查不含 JWT、管理员密码或 D1 Token。保留既有 chunk 大小提示，无依赖升级、Git 提交或推送。

首次 Worker 版本：`e35a4c4c-1685-4aa8-b875-07c9907e9661`。
首次 Pages 部署：`https://c8be609e.fluxvault-console.pages.dev`。
这证明发布完成，不代表自定义域名或线上业务验收完成。Telegram Secret 和实例已配置；上传下载不在此次独立验收结果中。

跨域更新后的 Worker 版本：`44d67071-7bf4-4bf5-8202-c5b67e85c542`。

2026-10-25 用户确认使用无问题并授权提交及推送。该确认不替代上述未执行的独立检查。
