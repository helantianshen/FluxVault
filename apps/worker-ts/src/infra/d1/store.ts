import { Database, databaseFailure } from "./client";
import { notFound } from "../../fault";
import { filesRepository } from "./files";
import { instancesRepository } from "./instances";
import { keysRepository } from "./keys";

export interface Administrator {
  username: string;
  password_hash: string;
}

/** 三个业务仓储共享同一个 D1 绑定；不创建演示数据 */
export function createD1Store(binding: D1Database) {
  const db = new Database(binding);
  return {
    ...filesRepository(db),
    ...instancesRepository(db),
    ...keysRepository(db),
    async findAdministrator(): Promise<Administrator> {
      const unfilled = await db.query<{ id: string }>(
        "SELECT id FROM files WHERE name_search = '' LIMIT 1",
      );
      if (unfilled.length) throw databaseFailure();
      const rows = await db.query<Administrator>(
        "SELECT username,password_hash FROM administrators WHERE id=1",
      );
      if (!rows[0]) throw notFound();
      return rows[0];
    },
    /** 初始化竞争时保留先成功的记录，环境密码不覆盖已保存摘要 */
    async initializeAdministrator(username: string, passwordHash: string) {
      await db.query(
        "INSERT INTO administrators(id,username,password_hash,created_at) VALUES(1,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id",
        username,
        passwordHash,
        new Date().toISOString(),
      );
      return this.findAdministrator();
    },
  };
}
