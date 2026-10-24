import type { APIKey, KeyStatus } from "./model";
export interface KeyRepository {
  listKeys(): Promise<APIKey[]>;
  findKeyByHash(hash: string): Promise<APIKey>;
  createKey(key: APIKey): Promise<void>;
  setKeyStatus(id: string, status: KeyStatus): Promise<APIKey>;
  rotateKey(id: string, hash: string, prefix: string): Promise<APIKey>;
}
