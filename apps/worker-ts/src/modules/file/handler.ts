import type { Files } from "./service";
import { Hono, type MiddlewareHandler } from "hono";
import type { HTTPEnv } from "../../httpx/types";
import { fileDTO } from "./dto";
import { query } from "../../httpx/validation";
import { fileFilterSchema, uploadQuery, downloadQuery } from "./schema";
import { Fault } from "../../fault";
/** 注册文件生命周期接口，由调用方指定必需和可选的认证链 */
export function fileRoutes(
  files: Files,
  required: MiddlewareHandler<HTTPEnv>,
  optional: MiddlewareHandler<HTTPEnv>,
) {
  const app = new Hono<HTTPEnv>();
  app.get("/files/:id/content", optional, async (c) => {
    const { mode } = query(c, downloadQuery);
    const { file, body } = await files.download(
      c.get("principal"),
      c.req.param("id"),
      mode,
    );
    return new Response(body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(file.name).replaceAll("'", "%27")}`,
        "Content-Security-Policy": "sandbox",
      },
    });
  });
  app.get("/files", required, async (c) => {
    const f = query(c, fileFilterSchema);
    const page = await files.list(c.get("principal"), {
      q: f.q,
      state: f.state,
      visibility: f.visibility,
      instanceID: f.instance_id,
      limit: f.limit,
      offset: f.offset,
    });
    return c.json({ ...page, items: page.items.map(fileDTO) });
  });
  app.post("/files", required, async (c) => {
    const input = query(c, uploadQuery);
    const contentType = c.req
      .header("Content-Type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (
      !contentType ||
      !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType)
    )
      throw new Fault("invalid_request", "必须提供有效 Content-Type");
    const body =
      c.req.raw.body ??
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });
    const file = await files.upload(c.get("principal"), {
      name: input.name,
      instanceID: input.instance_id,
      visibility: input.visibility,
      contentType,
      body,
    });
    return c.json(fileDTO(file), 201);
  });
  app.get("/files/:id", required, async (c) =>
    c.json(fileDTO(await files.get(c.get("principal"), c.req.param("id")))),
  );
  app.delete("/files/:id", required, async (c) => {
    await files.delete(c.get("principal"), c.req.param("id"));
    return c.body(null, 204);
  });
  return app;
}
