import { Fault } from "../../fault";
import type { Instance } from "./model";
export function acceptUpload(instance: Instance, visibility: string) {
  if (!instance.enabled) throw new Fault("conflict", "存储实例已禁用");
  if (visibility === "private" && !instance.privateSupported)
    throw new Fault("invalid_request", "该实例不支持严格私有文件");
}
export const metadataOnlyDelete = (instance: Instance) =>
  instance.provider === "telegram";
