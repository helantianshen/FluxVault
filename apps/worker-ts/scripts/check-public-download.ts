import assert from "node:assert/strict";
import { createMemoryStore } from "../src/infra/memory/store";
import { MemoryObjects } from "../src/infra/memory/objects";
import { Files } from "../src/modules/file/service";
import { Instances } from "../src/modules/storage/service";
import { Keys } from "../src/modules/identity/service";
import { administrator } from "../src/modules/identity/model";
import { createApp } from "../src/server/app";

// 使用实际路由、服务和仓储验证缓存边界，不连接远端服务
const repo = createMemoryStore();
await repo.createInstance({
  id: "local",
  name: "local",
  provider: "telegram",
  privateSupported: true,
  secretRef: "UNUSED",
  enabled: true,
  createdAt: new Date().toISOString(),
});
const objects = new MemoryObjects();
let reads = 0;
const download = objects.download.bind(objects);
objects.download = async (...args) => {
  reads++;
  return download(...args);
};
const instances = new Instances(repo);
const files = new Files(repo, instances, objects);
const app = createApp({
  files,
  instances,
  keys: new Keys(repo),
  allowedOrigin: "https://console.example.com",
  mode: "d1",
  auth: {
    verify: async () => {},
    login: async () => {
      throw new Error("unused");
    },
  },
});
const entries = new Map<string, Response>();
let cacheReads = 0;
let failCache = false;
Object.defineProperty(globalThis, "caches", {
  value: {
    default: {
      async match(key: string) {
        cacheReads++;
        if (failCache) throw new Error("unavailable");
        return entries.get(key)?.clone();
      },
      async put(key: string, response: Response) {
        if (failCache) throw new Error("unavailable");
        entries.set(key, new Response(await response.arrayBuffer(), response));
      },
    },
  },
});
const pending: Promise<unknown>[] = [];
const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise) };
/** 等待后台缓存写入，便于下一次请求检查真实的回源计数 */
async function request(path: string, headers?: Record<string, string>) {
  const response = await app.fetch(
    new Request(`https://files.example.com${path}`, { headers }),
    undefined,
    ctx as ExecutionContext,
  );
  const body = await response.text();
  await Promise.all(pending.splice(0));
  assert.equal(response.headers.get("cache-control"), "no-store");
  return { response, body };
}
/** 创建不同可见性的测试文件 */
async function upload(visibility: "public" | "private") {
  return files.upload(administrator, {
    name: "example.txt",
    instanceID: "local",
    visibility,
    contentType: "text/plain",
    body: new Response("safe content").body!,
  });
}
const file = await upload("public");
const path = `/api/v1/files/${file.id}/content`;
assert.equal((await request(path)).body, "safe content");
assert.equal(reads, 1);
assert.equal(entries.size, 1);
assert.equal((await request(path + "?mode=proxy")).body, "safe content");
assert.equal(reads, 1, "cache hit must avoid object store");
assert.equal(
  (await request(path, { Authorization: "Bearer invalid" })).response.status,
  401,
);
assert.equal((await request(path + "?mode=direct")).response.status, 422);
assert.equal((await request(path + "?mode=invalid")).response.status, 400);
const privateFile = await upload("private");
const before = cacheReads;
assert.equal(
  (await request(`/api/v1/files/${privateFile.id}/content`)).response.status,
  404,
);
assert.equal(
  cacheReads,
  before,
  "private access must fail before cache lookup",
);
await request(`/admin/v1/files/${privateFile.id}/content`);
await request(`/admin/v1/files/${file.id}/content`);
assert.equal(cacheReads, before, "admin downloads must bypass cache");
await repo.beginDelete(file.id);
assert.equal((await request(path)).response.status, 409);
await repo.removeFile(file.id);
assert.equal((await request(path)).response.status, 404);
assert.equal(
  cacheReads,
  before,
  "stale cached bytes cannot bypass state checks",
);
failCache = true;
const fallback = await upload("public");
assert.equal(
  (await request(`/api/v1/files/${fallback.id}/content`)).body,
  "safe content",
);
console.log(
  "Public download checks passed: cache hit, auth, private/admin bypass, deleting/deleted denial, cache failure fallback.",
);
