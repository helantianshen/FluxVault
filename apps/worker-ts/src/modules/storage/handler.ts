import type { Instances } from "./service";
import { Hono, type MiddlewareHandler } from "hono";
import type { HTTPEnv } from "../../httpx/types";
import { instanceDTO } from "./dto";
import { json } from "../../httpx/validation";
import { createInstanceSchema, updateInstanceSchema } from "./schema";

/** 注册管理员的存储实例接口，每条路由保留管理员认证 */
export function instancesRoutes(
  instances: Instances,
  auth: MiddlewareHandler<HTTPEnv>,
) {
  const app = new Hono<HTTPEnv>();
  // 返回全部实例的安全展示数据
  app.get("/", auth, async (c) =>
    c.json({
      items: (await instances.list()).map(instanceDTO),
    }),
  );
  // 创建实例前按 Schema 校验 Provider 与 Secret 引用
  app.post("/", auth, async (c) => {
    const input = await json(c, createInstanceSchema);
    const instance = await instances.create({
      name: input.name,
      provider: input.provider,
      secretRef: input.secret_ref,
      privateSupported: input.private_supported,
    });
    return c.json(instanceDTO(instance), 201);
  });
  // 更新指定实例的名称或启用状态
  app.patch("/:id", auth, async (c) =>
    c.json(
      instanceDTO(
        await instances.update(
          c.req.param("id"),
          await json(c, updateInstanceSchema),
        ),
      ),
    ),
  );
  // 删除无文件引用的实例，成功时返回 204
  app.delete("/:id", auth, async (c) => {
    await instances.delete(c.req.param("id"));
    return c.body(null, 204);
  });
  return app;
}
