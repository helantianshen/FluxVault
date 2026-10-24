import { Fault } from "../../fault";
/** 只暴露参数化查询，屏蔽 D1 原始错误中的 SQL 和敏感数据 */
export class Database {
  constructor(private db: D1Database) {}
  async query<T>(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<T[]> {
    try {
      const result = await this.db
        .prepare(sql)
        .bind(...params)
        .all<T>();
      if (!result.success) throw new Error("query failed");
      return result.results;
    } catch {
      throw databaseFailure();
    }
  }
  /** 批内语句在同一事务中顺序执行，总数与页内容使用同一快照 */
  async batch(queries: { sql: string; params: (string | number | null)[] }[]) {
    try {
      const results = await this.db.batch(
        queries.map((q) => this.db.prepare(q.sql).bind(...q.params)),
      );
      if (results.some((r) => !r.success)) throw new Error("batch failed");
      return results;
    } catch {
      throw databaseFailure();
    }
  }
}
export function databaseFailure() {
  return new Fault(
    "metadata_failure",
    "数据库暂时不可用，请检查 D1 配置与迁移",
  );
}
