import { hash } from "bcryptjs";
import { Fault } from "../fault";
import { createD1Store } from "../infra/d1/store";
import { AdminAuth } from "../modules/auth/service";
import { Files } from "../modules/file/service";
import { Instances } from "../modules/storage/service";
import { Keys } from "../modules/identity/service";
import { createApp } from "../server/app";
import { createSDKObjects } from "./sdk";
import type { Bindings } from "./mock";

/** 使用原生 D1 绑定与真实 Provider，只在空管理员表中写入初始化摘要 */
export async function createPersistent(env: Bindings) {
  if (
    env.RUNTIME_MODE !== "d1" ||
    !env.DB ||
    new TextEncoder().encode(env.JWT_SECRET ?? "").length < 32 ||
    !env.ADMIN_USERNAME ||
    env.ADMIN_USERNAME.length > 120 ||
    !env.ALLOWED_ORIGIN
  )
    throw new Error("invalid D1 configuration");
  const repo = createD1Store(env.DB);
  let admin;
  try {
    admin = await repo.findAdministrator();
  } catch (error) {
    if (!(error instanceof Fault) || error.code !== "not_found") throw error;
    const password = env.ADMIN_PASSWORD ?? "";
    const length = new TextEncoder().encode(password).length;
    if (length < 12 || length > 72)
      throw new Error("administrator bootstrap requires password", {
        cause: error,
      });
    admin = await repo.initializeAdministrator(
      env.ADMIN_USERNAME,
      await hash(password, 12),
    );
  }
  const instances = new Instances(repo);
  return {
    app: createApp({
      mode: "d1",
      files: new Files(repo, instances, createSDKObjects({ ...env })),
      instances,
      keys: new Keys(repo),
      auth: AdminAuth.fromHash(
        admin.username,
        admin.password_hash,
        env.JWT_SECRET,
      ),
      allowedOrigin: env.ALLOWED_ORIGIN,
    }),
  };
}
