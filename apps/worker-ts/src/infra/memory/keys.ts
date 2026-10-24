import { Fault, notFound } from "../../fault";
import type { APIKey, KeyStatus } from "../../modules/identity/model";
import { validateStatus } from "../../modules/identity/policy";
import type { KeyRepository } from "../../modules/identity/repo";
import type { MemoryState } from "./model";
export function keysRepository(state: MemoryState): KeyRepository {
  return {
    async listKeys() {
      return structuredClone(
        [...state.keys.values()].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
    },
    async findKeyByHash(hash: string) {
      const k = [...state.keys.values()].find((k) => k.hash === hash);
      if (!k) throw notFound();
      return structuredClone(k);
    },
    async createKey(key: APIKey) {
      state.keys.set(key.id, structuredClone(key));
    },
    async setKeyStatus(id: string, status: KeyStatus) {
      const k = state.keys.get(id);
      if (!k) throw notFound();
      validateStatus(k.status, status);
      k.status = status;
      return structuredClone(k);
    },
    async rotateKey(id: string, hash: string, prefix: string) {
      const k = state.keys.get(id);
      if (!k) throw notFound();
      if (k.status === "revoked")
        throw new Fault("conflict", "已撤销的密钥不能轮换");
      k.hash = hash;
      k.prefix = prefix;
      return structuredClone(k);
    },
  };
}
