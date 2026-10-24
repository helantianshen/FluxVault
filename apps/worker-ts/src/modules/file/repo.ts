import type { FileFilter, FilePage, VaultFile } from "./model";
import type { Locator } from "../storage/model";
export interface FileRepository {
  createFile(file: VaultFile): Promise<void>;
  findFile(id: string): Promise<VaultFile>;
  listFiles(filter: FileFilter): Promise<FilePage>;
  completeFile(id: string, locator: Locator, size: number): Promise<VaultFile>;
  recordFailure(id: string, code: string): Promise<void>;
  beginDelete(id: string): Promise<VaultFile>;
  removeFile(id: string): Promise<void>;
}
