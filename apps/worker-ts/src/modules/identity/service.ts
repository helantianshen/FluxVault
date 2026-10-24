import { Fault } from "../../fault";
import type { APIKey, Principal } from "./model";
import { active, validateScopes } from "./policy";
import type { CreateKey } from "./model";
import type { KeyRepository } from "./repo";
/** 对高熵 API Key 计算 SHA-256 摘要，不能用于管理员密码散列 */
export async function hashKey(secret: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
/** 将 32 字节密码学随机数编码为无填充 URL 安全 Base64 */
function newSecret() {
  return (
    "fv_" +
    btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "")
  );
}
export class Keys {
  /** 注入密钥仓储，签发和认证复用同一份状态 */
  constructor(private readonly keyRepo: KeyRepository) {}
  /** 校验权限与到期时间，保存随机密钥的摘要并返回一次性原文 */
  async create(input: CreateKey) {
    validateScopes(input.scopes);
    if (input.expiresAt && Date.parse(input.expiresAt) <= Date.now())
      throw new Fault("invalid_request", "到期时间必须晚于当前时间");
    const secret = newSecret();
    const key: APIKey = {
      ...input,
      name: input.name.trim(),
      id: crypto.randomUUID(),
      hash: await hashKey(secret),
      prefix: secret.slice(0, 11),
      status: "enabled",
      createdAt: new Date().toISOString(),
    };
    await this.keyRepo.createKey(key);
    return { key, secret };
  }
  /** 生成新随机密钥并替换摘要，已撤销密钥由仓储拒绝轮换 */
  async rotate(id: string) {
    const secret = newSecret();
    const key = await this.keyRepo.rotateKey(
      id,
      await hashKey(secret),
      secret.slice(0, 11),
    );
    return { key, secret };
  }
  /** 按摘要查询有效密钥，查询失败或失效均返回统一认证错误 */
  async authenticate(secret: string): Promise<Principal> {
    const key = await this.keyRepo
      .findKeyByHash(await hashKey(secret))
      .catch(() => null);
    if (!key || !active(key))
      throw new Fault("unauthorized", "API Key 无效或已失效");
    return { admin: false, keyID: key.id, scopes: key.scopes };
  }

  /** 读取密钥元数据，协议层通过 DTO 排除哈希 */
  list() {
    return this.keyRepo.listKeys();
  }

  /** 更新密钥状态，由仓储保证已撤销密钥不能恢复 */
  updateStatus(id: string, status: APIKey["status"]) {
    return this.keyRepo.setKeyStatus(id, status);
  }
}
