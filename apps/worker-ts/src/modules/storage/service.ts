import type { CreateInstance } from "./model";
import type { InstanceRepository } from "./repo";
import { acceptUpload } from "./policy";
export class Instances {
  /** 注入实例仓储，实例管理入口由本应用对象提供 */
  constructor(private readonly instanceRepo: InstanceRepository) {}
  /** 读取已有文件关联的实例，禁用状态不阻止下载和删除 */
  get(id: string) {
    return this.instanceRepo.findInstance(id);
  }

  /** 读取上传目标并验证启用状态与私有文件支持能力 */
  async getForUpload(id: string, visibility: string) {
    const instance = await this.get(id);
    acceptUpload(instance, visibility);
    return instance;
  }

  /** 生成实例标识和时间，将规范化后的名称与配置保存 */
  async create(input: CreateInstance) {
    const instance = {
      ...input,
      name: input.name.trim(),
      id: crypto.randomUUID(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await this.instanceRepo.createInstance(instance);
    return instance;
  }

  /** 列出管理员可管理的实例元数据 */
  list() {
    return this.instanceRepo.listInstances();
  }

  /** 更新经过协议层校验的名称和启用状态 */
  update(id: string, changes: { name?: string; enabled?: boolean }) {
    return this.instanceRepo.updateInstance(id, changes);
  }

  /** 删除实例，由仓储检查仍被文件引用的情况 */
  delete(id: string) {
    return this.instanceRepo.removeInstance(id);
  }
}
