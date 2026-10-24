import type { Locator } from "../storage/model";
export type FileState = "pending" | "ready" | "deleting";
export type Visibility = "private" | "public";
export interface VaultFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
  instanceID: string;
  ownerID: string;
  visibility: Visibility;
  state: FileState;
  locator: Locator | null;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}
export interface FileFilter {
  q: string;
  state?: FileState;
  visibility?: Visibility;
  instanceID?: string;
  ownerID?: string;
  limit: number;
  offset: number;
}
export interface FilePage {
  items: VaultFile[];
  total: number;
  limit: number;
  offset: number;
}

export interface Upload {
  name: string;
  instanceID: string;
  visibility: Visibility;
  contentType: string;
  body: ReadableStream<Uint8Array>;
}
