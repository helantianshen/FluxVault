import type { APIKey } from "../../api/types";
export function KeyStatusBadge({ apiKey }: { apiKey: APIKey }) {
  const expired =
    !!apiKey.expires_at && Date.parse(apiKey.expires_at) <= Date.now();
  const available = apiKey.status === "enabled" && !expired;
  const label =
    apiKey.status === "revoked"
      ? "已撤销"
      : apiKey.status === "disabled"
        ? "已禁用"
        : expired
          ? "已过期"
          : "已启用";
  return (
    <span className={`badge ${available ? "ready" : "disabled"}`}>{label}</span>
  );
}
