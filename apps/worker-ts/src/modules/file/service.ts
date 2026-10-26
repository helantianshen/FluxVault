import { Fault, notFound } from "../../fault";
import { canDelete, downloadable, validateName } from "./policy";
import type { FileFilter, VaultFile } from "./model";
import type { Principal } from "../identity/model";
import { hasScope, owner } from "../identity/policy";
import { metadataOnlyDelete } from "../storage/policy";
import type { Upload } from "./model";
import type { FileRepository } from "./repo";
import type { ObjectStore } from "../storage/repo";
import type { Instances } from "../storage/service";
export class Files {
  /** 注入文件仓储、实例服务与正文存储，不向协议层公开依赖 */
  constructor(
    private readonly fileRepo: FileRepository,
    private readonly instances: Pick<Instances, "get" | "getForUpload">,
    private readonly objectStore: ObjectStore,
  ) {}
  /** 先保存 pending，再上传正文并确认 ready；失败保留可排查记录 */
  async upload(p: Principal, input: Upload) {
    if (!hasScope(p, "upload"))
      throw new Fault("forbidden", "需要 upload 权限");
    validateName(input.name);
    const instance = await this.instances.getForUpload(
      input.instanceID,
      input.visibility,
    );
    const now = new Date().toISOString();
    const file: VaultFile = {
      id: crypto.randomUUID(),
      name: input.name,
      contentType: input.contentType,
      size: 0,
      instanceID: instance.id,
      ownerID: owner(p),
      visibility: input.visibility,
      state: "pending",
      locator: null,
      lastError: "",
      createdAt: now,
      updatedAt: now,
    };
    // 上传前保存记录，使远端失败仍有可定位的文件 ID
    await this.fileRepo.createFile(file);
    let result;
    try {
      result = await this.objectStore.upload(instance, file.id, input.body);
    } catch (error) {
      const code = error instanceof Fault ? error.code : "storage_failure";
      await this.fileRepo.recordFailure(file.id, code).catch(() => {});
      throw new Fault(code, "上传未完成，文件记录已保留供排查", file.id);
    }
    // 远端成功后再确认元数据，确认失败不能返回 ready
    try {
      return await this.fileRepo.completeFile(
        file.id,
        result.locator,
        result.size,
      );
    } catch {
      await this.fileRepo
        .recordFailure(file.id, "metadata_failure")
        .catch(() => {});
      throw new Fault(
        "metadata_failure",
        "远端内容已写入，但元数据确认失败，请排查待完成记录",
        file.id,
      );
    }
  }
  /** 按读取权限收紧文件归属条件，再执行分页查询 */
  async list(p: Principal, filter: FileFilter) {
    if (!hasScope(p, "read")) throw new Fault("forbidden", "需要 read 权限");
    return this.fileRepo.listFiles({
      ...filter,
      ownerID: p.admin ? undefined : p.keyID,
    });
  }
  /** 返回有权读取的文件，无权限时隐藏资源是否存在 */
  async get(p: Principal, id: string) {
    const file = await this.fileRepo.findFile(id);
    if (!p.admin && (!hasScope(p, "read") || file.ownerID !== p.keyID))
      throw notFound();
    return file;
  }
  /** 验证下载权限和状态，正文按需读取以允许协议层复用缓存 */
  async download(p: Principal, id: string, mode: string) {
    const file = await this.fileRepo.findFile(id);
    downloadable(file, p);
    if (mode === "direct")
      throw new Fault(
        "direct_unavailable",
        "mock 存储不提供安全直链，请使用 auto 或 proxy",
      );
    const locator = file.locator;
    if (!locator) throw new Fault("storage_failure", "远端内容不可用");
    return {
      file,
      readBody: async () => {
        const instance = await this.instances.get(file.instanceID);
        return this.objectStore.download(instance, locator);
      },
    };
  }
  /** 先持久化 deleting，再按 Provider 语义删除正文和元数据 */
  async delete(p: Principal, id: string) {
    let file = await this.fileRepo.findFile(id);
    if (!canDelete(file, p)) throw notFound();
    const instance = await this.instances.get(file.instanceID);
    file = await this.fileRepo.beginDelete(id);
    // Telegram 仅清理元数据；其他 Provider 在正文删除成功后清理记录
    if (!metadataOnlyDelete(instance)) {
      try {
        if (!file.locator) throw new Error("missing locator");
        await this.objectStore.delete(instance, file.locator);
      } catch {
        await this.fileRepo
          .recordFailure(id, "storage_failure")
          .catch(() => {});
        throw new Fault(
          "storage_failure",
          "远端删除失败，已保留删除中记录，可重试",
          id,
        );
      }
    }
    try {
      await this.fileRepo.removeFile(id);
    } catch {
      await this.fileRepo.recordFailure(id, "metadata_failure").catch(() => {});
      throw new Fault("metadata_failure", "清理文件记录失败，可重试删除", id);
    }
  }
}
