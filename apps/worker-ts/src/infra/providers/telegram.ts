import { Api, InputFile } from "grammy/web";
import type { Adapter, Fetch, TelegramConfig } from "./model";
import { getBody, storageError } from "./stream";

export class TelegramAdapter implements Adapter {
  private client: Api;
  constructor(
    private config: TelegramConfig,
    private fetcher: Fetch,
  ) {
    this.client = new Api(config.bot_token, {
      fetch: fetcher,
      timeoutSeconds: 120,
    });
  }
  async upload(id: string, body: Uint8Array<ArrayBuffer>) {
    const result = await this.client.sendDocument(
      this.config.chat_id,
      new InputFile(body, id),
      { disable_content_type_detection: true, disable_notification: true },
    );
    if (!result.document?.file_id) throw storageError();
    return result.document.file_id;
  }
  async download(key: string) {
    const file = await this.client.getFile(key);
    const path = file.file_path;
    if (
      !path ||
      path.startsWith("/") ||
      path
        .split("/")
        .some((part) => part === ".." || part === "." || part === "") ||
      /[?%#\\\r\n]/.test(path)
    )
      throw storageError();
    // 每次下载重新取路径，带 Token 的 URL 只用于服务端请求
    return getBody(
      this.fetcher,
      `https://api.telegram.org/file/bot${this.config.bot_token}/${path}`,
    );
  }
  async delete() {}
}
