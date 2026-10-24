import type { VaultFile } from "../../modules/file/model";
import type { APIKey } from "../../modules/identity/model";
import type { Instance } from "../../modules/storage/model";
export interface MemoryState {
  files: Map<string, VaultFile>;
  instances: Map<string, Instance>;
  keys: Map<string, APIKey>;
}
