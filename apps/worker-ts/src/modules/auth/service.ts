import { compare, hash, getRounds } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { Fault } from "../../fault";
import type { AdminAuthenticator } from "./model";
export class AdminAuth implements AdminAuthenticator {
  private attempts = 0;
  private window = 0;
  private constructor(
    private username: string,
    private passwordHash: string,
    private secret: Uint8Array,
  ) {}
  /** 对本地管理员密码计算 bcrypt 摘要，仅保留摘要与 JWT 签名材料 */
  static async create(username: string, password: string, secret: string) {
    return new AdminAuth(
      username,
      await hash(password, 12),
      new TextEncoder().encode(secret),
    );
  }
  /** 复用数据库中的 bcrypt 摘要，环境密码只用于首次初始化 */
  static fromHash(username: string, passwordHash: string, secret: string) {
    const rounds = getRounds(passwordHash);
    if (
      !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash) ||
      rounds < 4 ||
      rounds > 16
    )
      throw new Error("invalid administrator hash");
    return new AdminAuth(
      username,
      passwordHash,
      new TextEncoder().encode(secret),
    );
  }
  /** 在进程内限流后校验管理员凭据，签发有效期为 12 小时的 JWT */
  async login(username: string, password: string) {
    const now = Date.now();
    if (now - this.window >= 60_000) {
      this.window = now;
      this.attempts = 0;
    }
    if (++this.attempts > 10)
      throw new Fault("rate_limited", "登录尝试过多，请一分钟后重试");
    const valid = await compare(password, this.passwordHash);
    if (username !== this.username || !valid)
      throw new Fault("unauthorized", "用户名或密码错误");
    const expiry = Math.floor(now / 1000) + 12 * 3600;
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fluxvault-admin")
      .setAudience("fluxvault-console")
      .setSubject(this.username)
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(this.secret);
    return { token, expiresAt: new Date(expiry * 1000).toISOString() };
  }
  /** 固定算法、签发者、受众和管理员身份，拒绝过期或不匹配的 JWT */
  async verify(token: string) {
    try {
      await jwtVerify(token, this.secret, {
        algorithms: ["HS256"],
        issuer: "fluxvault-admin",
        audience: "fluxvault-console",
        subject: this.username,
        requiredClaims: ["exp"],
      });
    } catch {
      throw new Fault("unauthorized", "管理员登录已失效");
    }
  }
}
