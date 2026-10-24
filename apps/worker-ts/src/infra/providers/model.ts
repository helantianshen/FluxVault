export const MAX_UPLOAD_BYTES = 8 << 20;
export const REQUEST_TIMEOUT_MS = 120_000;
export type SecretResolver = (name: string) => string | undefined;
export type Fetch = typeof globalThis.fetch;

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  access_key: string;
  secret_key: string;
  session_token?: string;
  prefix: string;
}
export interface GitHubConfig {
  owner: string;
  repo: string;
  release_id: number;
  token: string;
}
export interface TelegramConfig {
  bot_token: string;
  chat_id: string;
}
export interface Adapter {
  upload(id: string, body: Uint8Array<ArrayBuffer>): Promise<string>;
  download(key: string): Promise<ReadableStream<Uint8Array>>;
  delete(key: string): Promise<void>;
}
export interface Binding {
  adapter: Adapter;
  target: string;
}
