import { Fault } from "../../fault";
import type { Instance, Locator } from "../../modules/storage/model";
import type { ObjectStore } from "../../modules/storage/repo";
export const MAX_FILE_BYTES = 8 << 20;
export const MAX_TOTAL_BYTES = 32 << 20;
export class MemoryObjects implements ObjectStore {
  private objects = new Map<string, { chunks: Uint8Array[]; size: number }>();
  private used = 0;
  async upload(
    _instance: Instance,
    id: string,
    body: ReadableStream<Uint8Array>,
  ) {
    if (this.used + MAX_FILE_BYTES > MAX_TOTAL_BYTES) {
      await body.cancel();
      throw new Fault("capacity_exceeded", "mock 对象空间不足");
    }
    this.used += MAX_FILE_BYTES;
    let committed = false;
    const reader = body.getReader();
    try {
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_FILE_BYTES)
          throw new Fault("payload_too_large", "mock 单文件上限为 8 MiB");
        chunks.push(next.value.slice());
      }
      this.objects.set(id, { chunks, size });
      this.used -= MAX_FILE_BYTES - size;
      committed = true;
      return { locator: { objectKey: id }, size };
    } finally {
      if (!committed) {
        this.used -= MAX_FILE_BYTES;
        await reader.cancel().catch(() => {});
      }
      reader.releaseLock();
    }
  }
  async download(_instance: Instance, locator: Locator) {
    const object = this.objects.get(locator.objectKey);
    if (!object) throw new Fault("storage_failure", "远端内容不可用");
    let index = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = object.chunks[index++];
        if (chunk) controller.enqueue(chunk.slice());
        else controller.close();
      },
    });
  }
  async delete(_instance: Instance, locator: Locator) {
    const object = this.objects.get(locator.objectKey);
    if (object) {
      this.used -= object.size;
      this.objects.delete(locator.objectKey);
    }
  }
}
