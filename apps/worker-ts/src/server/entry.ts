/** D1 线上入口按 URL 主机隔离；未配置域名时只允许本机调试 */
export function acceptsEntry(
  url: URL,
  adminHost?: string,
  publicHost?: string,
) {
  if (!adminHost && !publicHost)
    return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!adminHost || !publicHost || adminHost === publicHost) return false;
  const host = url.hostname;
  if (host !== adminHost && host !== publicHost) return false;
  if (url.pathname === "/healthz") return true;
  const prefix = host === adminHost ? "/admin/v1" : "/api/v1";
  return url.pathname === prefix || url.pathname.startsWith(prefix + "/");
}
