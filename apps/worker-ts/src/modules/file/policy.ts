import { Fault, notFound } from "../../fault";
import { hasScope } from "../identity/policy";
import type { Principal } from "../identity/model";
import type { VaultFile } from "./model";
export function validateName(name: string) {
  if (
    !name.trim() ||
    new TextEncoder().encode(name).length > 255 ||
    /[/\\\p{Cc}]/u.test(name)
  )
    throw new Fault(
      "invalid_request",
      "文件名必须为 1 至 255 字节且不能包含路径或控制字符",
    );
}
export const canRead = (f: VaultFile, p: Principal) =>
  p.admin ||
  f.visibility === "public" ||
  (hasScope(p, "read") && f.ownerID === p.keyID);
export const canDelete = (f: VaultFile, p: Principal) =>
  p.admin || (hasScope(p, "delete") && f.ownerID === p.keyID);
export function downloadable(f: VaultFile, p: Principal) {
  if (!canRead(f, p)) throw notFound();
  if (f.state !== "ready") throw new Fault("conflict", "文件尚不可下载");
}
