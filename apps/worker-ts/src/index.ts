import { createMock, type Bindings } from "./app/mock";
let runtime: ReturnType<typeof createMock> | undefined;
export default {
  async fetch(request: Request, env: Bindings) {
    const host = new URL(request.url).hostname;
    if (!["127.0.0.1", "localhost", "[::1]"].includes(host))
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
      runtime ??= createMock(env).catch((error) => {
        runtime = undefined;
        throw error;
      });
      return (await runtime).app.fetch(request);
    } catch {
      return Response.json(
        {
          error: {
            code: "configuration_error",
            message: "请配置本地 mock 管理员密码与 JWT 密钥",
          },
        },
        { status: 503 },
      );
    }
  },
};
