import type { Keys } from "./service";
import { Hono, type MiddlewareHandler } from "hono";
import type { HTTPEnv } from "../../httpx/types";
import { keyDTO } from "./dto";
import { json } from "../../httpx/validation";
import { createKeySchema, updateKeySchema } from "./schema";

/** 注册管理员的API Key接口，每条路由保留管理员认证 */
export function keysRoutes(keys: Keys, auth: MiddlewareHandler<HTTPEnv>) {
  const app = new Hono<HTTPEnv>();
  // 列出密钥元数据，DTO 不包含摘要
  app.get("/", auth, async (c) =>
    c.json({ items: (await keys.list()).map(keyDTO) }),
  );
  // 签发密钥并仅在当前响应返回原文
  app.post("/", auth, async (c) => {
    const input = await json(c, createKeySchema);
    const { key, secret } = await keys.create({
      name: input.name,
      scopes: input.scopes,
      expiresAt: input.expires_at,
    });
    return c.json({ api_key: keyDTO(key), secret }, 201);
  });
  // 应用状态转换并保留撤销终态
  app.patch("/:id", auth, async (c) => {
    const input = await json(c, updateKeySchema);
    return c.json(
      keyDTO(await keys.updateStatus(c.req.param("id"), input.status)),
    );
  });
  // 轮换密钥并只返回新凭据原文
  app.post("/:id/rotate", auth, async (c) => {
    const { key, secret } = await keys.rotate(c.req.param("id"));
    return c.json({ api_key: keyDTO(key), secret });
  });
  return app;
}
