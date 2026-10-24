import { Fault } from "../../fault";
import { MAX_UPLOAD_BYTES, REQUEST_TIMEOUT_MS, type Fetch } from "./model";

export const storageError = () =>
  new Fault("storage_failure", "远端存储请求失败或实例配置无效");

export async function readUpload(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let completed = false;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_UPLOAD_BYTES)
        throw new Fault("payload_too_large", "SDK 代理上传单文件上限为 8 MiB");
      chunks.push(next.value.slice());
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    completed = true;
    return bytes;
  } finally {
    if (!completed) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function safeBody(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          reader.releaseLock();
          controller.close();
        } else controller.enqueue(next.value);
      } catch {
        reader.releaseLock();
        controller.error(storageError());
      }
    },
    async cancel() {
      try {
        await reader.cancel();
      } catch {
        throw storageError();
      } finally {
        reader.releaseLock();
      }
    },
  });
}

export function timedFetch(fetcher: Fetch): Fetch {
  return (input, init) => {
    const upstream =
      init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    return fetcher(input, {
      ...init,
      redirect: "manual",
      signal: upstream ? AbortSignal.any([upstream, timeout]) : timeout,
    });
  };
}

export function githubDownloadURL(raw: string) {
  const url = new URL(raw);
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "443") &&
    url.hostname.endsWith(".githubusercontent.com")
  );
}

export async function getBody(fetcher: Fetch, url: string) {
  const response = await fetcher(url);
  if (response.status !== 200 || !response.body) {
    await response.body?.cancel();
    throw storageError();
  }
  return response.body;
}
