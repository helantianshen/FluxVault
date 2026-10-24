import { Hono, type MiddlewareHandler } from "hono";
import type { HTTPEnv } from "../httpx/types";
import type { Services } from "./types";
import { instancesRoutes } from "../modules/storage/handler";
import { keysRoutes } from "../modules/identity/handler";
import { authRoutes } from "../modules/auth/handler";
import { fileRoutes } from "../modules/file/handler";
/** 组装管理接口，登录保持公开，其余模块分别注入管理员认证 */
export function adminRoutes(s: Services, auth: MiddlewareHandler<HTTPEnv>) {
  const app = new Hono<HTTPEnv>();
  app.route("/auth", authRoutes(s.auth));
  app.route("/", fileRoutes(s.files, auth, auth));
  // 管理员认证后返回当前 mock 模式与容量限制
  app.get("/system", auth, (c) =>
    c.json({
      mode: "mock",
      backend: "worker-ts",
      version: "0.1.0",
      max_file_bytes: 8388608,
      max_total_bytes: 33554432,
      database: "memory",
      real_providers: false,
    }),
  );
  app.route("/instances", instancesRoutes(s.instances, auth));
  app.route("/keys", keysRoutes(s.keys, auth));
  return app;
}
