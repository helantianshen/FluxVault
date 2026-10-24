import type { ObjectStore } from "../../modules/storage/repo";
import type { Instance, Locator } from "../../modules/storage/model";
import { Fault } from "../../fault";
import {
  githubConfig,
  objectID,
  remoteLocator,
  s3Config,
  telegramConfig,
} from "./config";
import type { Binding, Fetch, SecretResolver } from "./model";
import { S3Adapter } from "./s3";
import { GitHubAdapter } from "./github";
import { TelegramAdapter } from "./telegram";
import { readUpload, safeBody, storageError, timedFetch } from "./stream";

export class ProviderObjects implements ObjectStore {
  private fetcher: Fetch;
  constructor(
    private secrets: SecretResolver,
    fetcher: Fetch = globalThis.fetch,
  ) {
    this.fetcher = timedFetch(fetcher);
  }
  private resolve(instance: Instance): Binding {
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(instance.secretRef))
      throw storageError();
    const raw = this.secrets(instance.secretRef);
    if (!raw || raw.length > 16384) throw storageError();
    const value: unknown = JSON.parse(raw);
    switch (instance.provider) {
      case "s3": {
        const config = s3Config.parse(value);
        return {
          adapter: new S3Adapter(config, this.fetcher),
          target: `${config.endpoint}/${config.bucket}/${config.prefix}`,
        };
      }
      case "github": {
        const config = githubConfig.parse(value);
        return {
          adapter: new GitHubAdapter(config, this.fetcher),
          target: `${config.owner}/${config.repo}/${config.release_id}`,
        };
      }
      case "telegram": {
        const config = telegramConfig.parse(value);
        return {
          adapter: new TelegramAdapter(config, this.fetcher),
          target: `${config.bot_token.split(":")[0]}/${config.chat_id}`,
        };
      }
      default:
        throw storageError();
    }
  }
  private locate(instance: Instance, locator: Locator) {
    const binding = this.resolve(instance);
    if (locator.objectKey.length > 16384) throw storageError();
    const remote = remoteLocator.parse(JSON.parse(locator.objectKey));
    if (
      remote.provider !== instance.provider ||
      remote.instance !== instance.id ||
      remote.target !== binding.target
    )
      throw storageError();
    return { ...binding, key: remote.key };
  }
  async upload(
    instance: Instance,
    id: string,
    body: ReadableStream<Uint8Array>,
  ) {
    try {
      objectID.parse(id);
      const { adapter, target } = this.resolve(instance);
      const bytes = await readUpload(body);
      const key = await adapter.upload(id, bytes);
      if (!key) throw storageError();
      return {
        locator: {
          objectKey: JSON.stringify({
            v: 1,
            provider: instance.provider,
            instance: instance.id,
            target,
            key,
          }),
        },
        size: bytes.byteLength,
      };
    } catch (error) {
      if (!body.locked) await body.cancel().catch(() => {});
      if (error instanceof Fault && error.code === "payload_too_large")
        throw error;
      throw storageError();
    }
  }
  async download(instance: Instance, locator: Locator) {
    try {
      const { adapter, key } = this.locate(instance, locator);
      return safeBody(await adapter.download(key));
    } catch {
      throw storageError();
    }
  }
  async delete(instance: Instance, locator: Locator) {
    if (instance.provider === "telegram") return;
    try {
      const { adapter, key } = this.locate(instance, locator);
      await adapter.delete(key);
    } catch {
      throw storageError();
    }
  }
}
