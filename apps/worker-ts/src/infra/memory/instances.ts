import { Fault, notFound } from "../../fault";
import type { Instance } from "../../modules/storage/model";
import type { InstanceRepository } from "../../modules/storage/repo";
import type { MemoryState } from "./model";
export function instancesRepository(state: MemoryState): InstanceRepository {
  return {
    async listInstances() {
      return structuredClone(
        [...state.instances.values()].sort((a, b) => a.id.localeCompare(b.id)),
      );
    },
    async findInstance(id: string) {
      const i = state.instances.get(id);
      if (!i) throw notFound();
      return structuredClone(i);
    },
    async createInstance(instance: Instance) {
      if (state.instances.has(instance.id))
        throw new Fault("conflict", "实例已存在");
      state.instances.set(instance.id, structuredClone(instance));
    },
    async updateInstance(
      id: string,
      input: { name?: string; enabled?: boolean },
    ) {
      const i = state.instances.get(id);
      if (!i) throw notFound();
      Object.assign(i, input);
      return structuredClone(i);
    },
    async removeInstance(id: string) {
      if (!state.instances.has(id)) throw notFound();
      if ([...state.files.values()].some((f) => f.instanceID === id))
        throw new Fault("conflict", "实例仍有关联文件，不能删除");
      state.instances.delete(id);
    },
  };
}
