import type { Files } from "../modules/file/service";
import type { FileRepository } from "../modules/file/repo";
import { administrator } from "../modules/identity/model";
import type { Visibility } from "../modules/file/model";
export async function seedFiles(files: Files, repo: FileRepository) {
  const seeds: {
    name: string;
    instanceID: string;
    visibility: Visibility;
    content: string;
  }[] = [
    {
      name: "欢迎使用 FluxVault.txt",
      instanceID: "s3-main",
      visibility: "public",
      content: "FluxVault mock environment. No cloud services are connected.\n",
    },
    {
      name: "版本说明.md",
      instanceID: "gh-release",
      visibility: "public",
      content: "# FluxVault Mock\n\nGo 与 Worker 使用相同接口契约。\n",
    },
    {
      name: "归档清单.json",
      instanceID: "tg-archive",
      visibility: "private",
      content: '{"environment":"mock","files":[]}\n',
    },
    {
      name: "删除重试示例.txt",
      instanceID: "s3-main",
      visibility: "private",
      content: "这是用于查看 deleting 状态的本地演示记录。\n",
    },
  ];
  for (const seed of seeds) {
    const file = await files.upload(administrator, {
      ...seed,
      contentType: "text/plain",
      body: new Response(seed.content).body!,
    });
    if (seed.name === "删除重试示例.txt") {
      await repo.beginDelete(file.id);
      await repo.recordFailure(file.id, "storage_failure");
    }
  }
  const now = new Date().toISOString();
  await repo.createFile({
    id: "mock-pending-upload",
    name: "待确认上传示例.txt",
    instanceID: "s3-main",
    visibility: "private",
    contentType: "text/plain",
    ownerID: "system",
    size: 0,
    state: "pending",
    locator: null,
    lastError: "storage_failure",
    createdAt: now,
    updatedAt: now,
  });
}
