import type { MiddlewareHandler } from "hono";
import type { HTTPEnv } from "../../httpx/types";
import { administrator } from "../identity/model";
import type { Keys } from "../identity/service";
import type { AdminAuthenticator } from "./model";

/** 只接受单个 Bearer 凭据，其余形式交由认证服务统一拒绝 */
const bearer = (header: string | undefined) =>
  /^Bearer\s+(\S+)$/i.exec(header ?? "")?.[1] ?? "";

/** 为管理入口和公共入口构造相互独立的认证链 */
export function authMiddleware(auth: AdminAuthenticator, keys: Keys) {
  const admin: MiddlewareHandler<HTTPEnv> = async (c, next) => {
    await auth.verify(bearer(c.req.header("Authorization")));
    c.set("principal", administrator);
    await next();
  };
  const key: MiddlewareHandler<HTTPEnv> = async (c, next) => {
    c.set(
      "principal",
      await keys.authenticate(bearer(c.req.header("Authorization"))),
    );
    await next();
  };
  // 匿名下载允许没有凭据，但显式携带无效凭据时仍拒绝请求
  const optionalKey: MiddlewareHandler<HTTPEnv> = async (c, next) => {
    if (c.req.header("Authorization")) await key(c, next);
    else await next();
  };
  return { admin, key, optionalKey };
}
