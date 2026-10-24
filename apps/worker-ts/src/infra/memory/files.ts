import { Fault, notFound } from "../../fault";
import type { FileFilter, VaultFile } from "../../modules/file/model";
import type { Locator } from "../../modules/storage/model";
import { acceptUpload } from "../../modules/storage/policy";
import type { FileRepository } from "../../modules/file/repo";
import type { MemoryState } from "./model";
export function filesRepository(state: MemoryState): FileRepository {
  return {
    async createFile(file: VaultFile) {
      const instance = state.instances.get(file.instanceID);
      if (!instance) throw notFound();
      acceptUpload(instance, file.visibility);
      if (state.files.has(file.id)) throw new Fault("conflict", "文件已存在");
      state.files.set(file.id, structuredClone(file));
    },
    async findFile(id: string) {
      const file = state.files.get(id);
      if (!file) throw notFound();
      return structuredClone(file);
    },
    async listFiles(f: FileFilter) {
      const items = [...state.files.values()]
        .filter(
          (file) =>
            (!f.ownerID || file.ownerID === f.ownerID) &&
            (!f.state || file.state === f.state) &&
            (!f.visibility || file.visibility === f.visibility) &&
            (!f.instanceID || file.instanceID === f.instanceID) &&
            file.name.toLowerCase().includes(f.q.toLowerCase()),
        )
        .sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
        );
      return {
        items: structuredClone(items.slice(f.offset, f.offset + f.limit)),
        total: items.length,
        limit: f.limit,
        offset: f.offset,
      };
    },
    async completeFile(id: string, locator: Locator, size: number) {
      const f = state.files.get(id);
      if (!f) throw notFound();
      if (f.state !== "pending")
        throw new Fault("conflict", "只有待完成文件可以确认上传");
      Object.assign(f, {
        locator,
        size,
        state: "ready",
        lastError: "",
        updatedAt: new Date().toISOString(),
      });
      return structuredClone(f);
    },
    async recordFailure(id: string, code: string) {
      const f = state.files.get(id);
      if (!f) throw notFound();
      f.lastError = code;
      f.updatedAt = new Date().toISOString();
    },
    async beginDelete(id: string) {
      const f = state.files.get(id);
      if (!f) throw notFound();
      if (f.state === "pending")
        throw new Fault("conflict", "待完成文件需先排查远端状态");
      f.state = "deleting";
      f.updatedAt = new Date().toISOString();
      return structuredClone(f);
    },
    async removeFile(id: string) {
      const f = state.files.get(id);
      if (!f) return;
      if (f.state !== "deleting")
        throw new Fault("conflict", "文件尚未进入删除状态");
      state.files.delete(id);
    },
  };
}
