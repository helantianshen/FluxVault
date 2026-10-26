import type { VaultFile } from "../../api/types";

const publicOrigin = (import.meta.env.VITE_PUBLIC_API_URL || "").replace(
  /\/$/,
  "",
);

/** 从公开入口生成稳定地址，缺少配置时不猜测管理域名 */
export function publicFileLink(file: VaultFile): string | null {
  if (!publicOrigin || file.visibility !== "public" || file.state !== "ready")
    return null;
  try {
    const url = new URL(publicOrigin);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    url.pathname = `/api/v1/files/${encodeURIComponent(file.id)}/content`;
    return url.href;
  } catch {
    return null;
  }
}
