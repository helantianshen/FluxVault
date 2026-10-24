import type { ObjectStore } from "../modules/storage/repo";
import { ProviderObjects } from "../infra/providers/store";

/** 只按实例声明的 Secret 引用解析配置，不在此处启用真实服务 */
export function createSDKObjects(env: Record<string, unknown>): ObjectStore {
  return new ProviderObjects((name) =>
    typeof env[name] === "string" ? env[name] : undefined,
  );
}

// 真实适配器的组装示例保持停用，默认入口使用 createMock
// repo 与 instances 服务必须使用持久化数据，不能混用 mock 的演示记录
// const files = new Files(repo, instances, createSDKObjects(env));
