import { Hono } from "hono";
import type { HTTPEnv } from "../../httpx/types";
import { json } from "../../httpx/validation";
import type { AdminAuthenticator } from "./model";
import { loginSchema } from "./schema";

/** 注册公开登录入口，仅在凭据验证成功后返回管理员 JWT */
export function authRoutes(auth: AdminAuthenticator) {
  const app = new Hono<HTTPEnv>();
  app.post("/login", async (c) => {
    const input = await json(c, loginSchema);
    const result = await auth.login(input.username, input.password);
    return c.json({
      access_token: result.token,
      token_type: "Bearer",
      expires_at: result.expiresAt,
    });
  });
  return app;
}
