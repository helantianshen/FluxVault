import { Fault } from "../../fault";
import type { APIKey, KeyStatus, Principal, Scope } from "./model";
export const hasScope = (p: Principal, scope: Scope) =>
  p.admin || (!!p.keyID && p.scopes.includes(scope));
export const owner = (p: Principal) => (p.admin ? "system" : p.keyID!);
export const active = (key: APIKey, now = Date.now()) =>
  key.status === "enabled" &&
  (!key.expiresAt || Date.parse(key.expiresAt) > now);
export function validateScopes(scopes: Scope[]) {
  if (
    !scopes.length ||
    scopes.length > 3 ||
    new Set(scopes).size !== scopes.length ||
    scopes.some((s) => !["upload", "read", "delete"].includes(s))
  )
    throw new Fault("invalid_request", "权限无效或重复");
}
export function validateStatus(current: KeyStatus, next: KeyStatus) {
  if (current === "revoked" && next !== "revoked")
    throw new Fault("conflict", "已撤销的密钥不能恢复");
}
