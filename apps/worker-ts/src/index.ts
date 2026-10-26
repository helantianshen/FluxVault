import { createPersistent } from "./app/persistent";
import { createMock, type Bindings } from "./app/mock";
import { acceptsEntry } from "./server/entry";
let runtime:
  Promise<{ app: Awaited<ReturnType<typeof createMock>>["app"] }> | undefined;
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const host = new URL(request.url).hostname;
    if (
      env.RUNTIME_MODE === "mock" &&
      !["127.0.0.1", "localhost", "[::1]"].includes(host)
    )
      return Response.json(
        {
          error: {
            code: "mock_local_only",
            message: "mock 仅允许本机开发访问",
          },
        },
        { status: 503 },
      );
    try {
      // 在初始化数据库和 CORS 之前拒绝错误入口，不能用请求头绕过域名限制
      if (
        env.RUNTIME_MODE === "d1" &&
        !acceptsEntry(new URL(request.url), env.ADMIN_HOST, env.PUBLIC_HOST)
      )
        return Response.json(
          { error: { code: "not_found", message: "资源不存在" } },
          {
            status: 404,
            headers: {
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      runtime ??= (
        env.RUNTIME_MODE === "d1" ? createPersistent(env) : createMock(env)
      ).catch((error) => {
        runtime = undefined;
        throw error;
      });
      return (await runtime).app.fetch(request, undefined, ctx);
    } catch {
      return Response.json(
        {
          error: {
            code: "configuration_error",
            message:
              env.RUNTIME_MODE === "d1"
                ? "请检查数据库迁移、管理员凭据与 JWT 密钥"
                : "请配置本地 mock 管理员密码与 JWT 密钥",
          },
        },
        { status: 503 },
      );
    }
  },
};
