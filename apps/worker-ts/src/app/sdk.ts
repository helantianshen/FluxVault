import type { ObjectStore } from "../modules/storage/repo";
import { ProviderObjects } from "../infra/providers/store";

/** 只按实例声明的 Secret 引用解析配置，不在此处启用真实服务 */
export function createSDKObjects(env: Record<string, unknown>): ObjectStore {
  return new ProviderObjects((name) =>
    typeof env[name] === "string" ? env[name] : undefined,
  );
}
