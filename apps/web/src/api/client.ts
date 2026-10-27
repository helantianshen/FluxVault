export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fileID?: string,
  ) {
    super(message);
  }
}
export const API_URL = (
  import.meta.env.VITE_ADMIN_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:18081" : "")
).replace(/\/$/, "");
export class ApiClient {
  constructor(
    private token: string | null,
    private unauthorized: () => void,
    private baseURL = API_URL,
  ) {}
  private async response(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    let response: Response;
    try {
      response = await fetch(`${this.baseURL}/admin/v1${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      throw new ApiError(
        "network_error",
        "无法连接管理 API，请检查服务地址和运行状态",
      );
    }
    if (!response.ok) {
      if (response.status === 401 && this.token) this.unauthorized();
      const data = await response.json().catch(() => null);
      throw new ApiError(
        data?.error?.code ?? "request_failed",
        data?.error?.message ?? `请求失败（${response.status}）`,
        data?.error?.file_id,
      );
    }
    return response;
  }
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.response(path, init);
    return response.status === 204 ? (undefined as T) : response.json();
  }
  json<T>(path: string, method: string, data?: unknown) {
    return this.request<T>(path, {
      method,
      ...(data === undefined
        ? {}
        : {
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" },
          }),
    });
  }
  /** 获取 Worker 图片预览正文，私有文件继续携带管理员凭据 */
  async preview(id: string, signal?: AbortSignal) {
    return (
      await this.response(`/files/${encodeURIComponent(id)}/preview`, {
        signal,
      })
    ).blob();
  }
  /** 获取鉴权文件正文，预览关闭时可取消仍在进行的请求 */
  async download(id: string, signal?: AbortSignal) {
    return (
      await this.response(`/files/${id}/content?mode=proxy`, { signal })
    ).blob();
  }
}
