import type { Instance, Locator } from "./model";
export interface InstanceRepository {
  listInstances(): Promise<Instance[]>;
  findInstance(id: string): Promise<Instance>;
  createInstance(instance: Instance): Promise<void>;
  updateInstance(
    id: string,
    input: { name?: string; enabled?: boolean },
  ): Promise<Instance>;
  removeInstance(id: string): Promise<void>;
}

export interface ObjectStore {
  upload(
    instance: Instance,
    id: string,
    body: ReadableStream<Uint8Array>,
  ): Promise<{ locator: Locator; size: number }>;
  download(
    instance: Instance,
    locator: Locator,
  ): Promise<ReadableStream<Uint8Array>>;
  delete(instance: Instance, locator: Locator): Promise<void>;
}
