import { imagePreview } from "../infra/images/preview";
import { createMemoryStore } from "../infra/memory/store";
import { MemoryObjects } from "../infra/memory/objects";
import { AdminAuth } from "../modules/auth/service";
import { Files } from "../modules/file/service";
import { Instances } from "../modules/storage/service";
import { Keys } from "../modules/identity/service";
import { seedFiles } from "./seed";
import type { Provider } from "../modules/storage/model";
import { createApp } from "../server/app";
export interface Bindings {
  RUNTIME_MODE: string;
  ADMIN_USERNAME: string;
  MOCK_ADMIN_PASSWORD: string;
  ADMIN_PASSWORD?: string;
  DB?: D1Database;
  JWT_SECRET: string;
  ALLOWED_ORIGIN: string;
  ADMIN_HOST?: string;
  PUBLIC_HOST?: string;
}
/** 校验本地凭据后组装共享仓储、业务服务和演示数据 */
export async function createMock(env: Bindings) {
  if (
    env.RUNTIME_MODE !== "mock" ||
    new TextEncoder().encode(env.MOCK_ADMIN_PASSWORD ?? "").length < 12 ||
    new TextEncoder().encode(env.MOCK_ADMIN_PASSWORD ?? "").length > 72 ||
    new TextEncoder().encode(env.JWT_SECRET ?? "").length < 32
  )
    throw new Error("mock requires explicit local credentials");
  const repo = createMemoryStore();
  const objects = new MemoryObjects();
  const now = new Date().toISOString();
  const seeds: [string, string, Provider, boolean, string][] = [
    ["s3-main", "对象存储", "s3", true, "S3_PRIMARY"],
    ["tg-archive", "文件归档", "telegram", true, "TG_ARCHIVE"],
    ["gh-release", "公开发行", "github", false, "GITHUB_RELEASE"],
  ];
  for (const [id, name, provider, privateSupported, secretRef] of seeds)
    await repo.createInstance({
      id,
      name,
      provider,
      privateSupported,
      secretRef,
      enabled: true,
      createdAt: now,
    });
  const instances = new Instances(repo);
  const files = new Files(repo, instances, objects);
  await seedFiles(files, repo);
  const auth = await AdminAuth.create(
    env.ADMIN_USERNAME,
    env.MOCK_ADMIN_PASSWORD,
    env.JWT_SECRET,
  );
  return {
    app: createApp({
      preview: imagePreview,
      files,
      instances,
      keys: new Keys(repo),
      auth,
      allowedOrigin: env.ALLOWED_ORIGIN,
    }),
    repo,
    objects,
    files,
  };
}
