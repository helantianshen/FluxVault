import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import { Fault, notFound } from "../fault";
import { anonymous } from "../modules/identity/model";
import { authMiddleware } from "../modules/auth/middleware";
import type { HTTPEnv } from "../httpx/types";
import type { Services } from "./types";
import { adminRoutes } from "./admin";
import { fileRoutes } from "../modules/file/handler";
import type { ContentfulStatusCode } from "hono/utils/http-status";
const statuses: Record<string, ContentfulStatusCode> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  direct_unavailable: 422,
  rate_limited: 429,
  storage_failure: 502,
  metadata_failure: 503,
  capacity_exceeded: 503,
};
/** 注册请求边界与两组 API，业务模块只接收各自需要的服务 */
export function createApp(s: Services) {
  const app = new Hono<HTTPEnv>();
  app.use("*", async (c, next) => {
    c.set("principal", anonymous);
    c.header("X-Request-ID", crypto.randomUUID());
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.use(
    "*",
    cors({
      origin: s.allowedOrigin,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["X-Request-ID"],
    }),
  );
  app.onError((error, c) => {
    const fault =
      error instanceof Fault
        ? error
        : error instanceof ZodError
          ? new Fault("invalid_request", "请求字段或类型无效")
          : new Fault("internal_error", "服务暂时不可用");
    const status = statuses[fault.code] ?? 500;
    if (status === 401) c.header("WWW-Authenticate", "Bearer");
    if (status === 429) c.header("Retry-After", "60");
    return c.json(
      {
        error: {
          code: fault.code,
          message: fault.message,
          ...(fault.fileID ? { file_id: fault.fileID } : {}),
        },
      },
      status,
    );
  });
  app.notFound(() => {
    throw notFound();
  });
  const auth = authMiddleware(s.auth, s.keys);
  app.get("/healthz", (c) =>
    c.json({ status: "ok", mode: s.mode ?? "mock", backend: "worker-ts" }),
  );
  app.route("/admin/v1", adminRoutes(s, auth.admin));
  app.route("/api/v1", fileRoutes(s.files, auth.key, auth.optionalKey));
  return app;
}
