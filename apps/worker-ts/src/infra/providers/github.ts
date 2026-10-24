import { Octokit } from "@octokit/core";
import type { Adapter, Fetch, GitHubConfig } from "./model";
import { getBody, githubDownloadURL, storageError } from "./stream";

const status = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;

export class GitHubAdapter implements Adapter {
  private client: Octokit;
  constructor(
    private config: GitHubConfig,
    private fetcher: Fetch,
  ) {
    this.client = new Octokit({
      auth: config.token,
      request: { fetch: fetcher },
    });
  }
  async upload(id: string, body: Uint8Array<ArrayBuffer>) {
    const result = await this.client.request(
      "POST https://uploads.github.com/repos/{owner}/{repo}/releases/{release_id}/assets{?name}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        release_id: this.config.release_id,
        name: id,
        data: body,
        headers: {
          "content-type": "application/octet-stream",
          "content-length": String(body.byteLength),
        },
      },
    );
    const asset = result.data as { id?: number; state?: string; size?: number };
    if (
      !Number.isSafeInteger(asset.id) ||
      asset.id! <= 0 ||
      asset.state !== "uploaded" ||
      asset.size !== body.byteLength
    )
      throw storageError();
    return String(asset.id);
  }
  private assetID(key: string) {
    if (!/^[1-9][0-9]*$/.test(key) || !Number.isSafeInteger(Number(key)))
      throw storageError();
    return Number(key);
  }
  async download(key: string) {
    const result = await this.client.request(
      "GET /repos/{owner}/{repo}/releases/assets/{asset_id}",
      {
        owner: this.config.owner,
        repo: this.config.repo,
        asset_id: this.assetID(key),
        headers: { accept: "application/octet-stream" },
        request: { parseSuccessResponseBody: false, redirect: "manual" },
      },
    );
    const body = result.data as unknown as ReadableStream<Uint8Array> | null;
    if (result.status === 200 && body) return body;
    await body?.cancel();
    // SDK 的成功响应类型只列出 200，下载接口也允许返回 302
    if (
      (result.status as number) !== 302 ||
      !result.headers.location ||
      !githubDownloadURL(result.headers.location)
    )
      throw storageError();
    // CDN 请求不携带仓库凭据，定位信息只保留资产 ID
    return getBody(this.fetcher, result.headers.location);
  }
  async delete(key: string) {
    const params = {
      owner: this.config.owner,
      repo: this.config.repo,
      asset_id: this.assetID(key),
    };
    try {
      await this.client.request(
        "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}",
        params,
      );
    } catch (error) {
      if (status(error) !== 404) throw error;
      // 404 可能表示权限不足，只有确认资产不存在且发行可访问才视为已删除
      try {
        await this.client.request(
          "GET /repos/{owner}/{repo}/releases/assets/{asset_id}",
          params,
        );
      } catch (lookupError) {
        if (status(lookupError) !== 404) throw lookupError;
        await this.client.request(
          "GET /repos/{owner}/{repo}/releases/{release_id}",
          {
            owner: this.config.owner,
            repo: this.config.repo,
            release_id: this.config.release_id,
          },
        );
        return;
      }
      throw error;
    }
  }
}
