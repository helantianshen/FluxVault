import { Fault, notFound } from "../../fault";
import { validateStatus } from "../../modules/identity/policy";
import type { APIKey } from "../../modules/identity/model";
import type { KeyRepository } from "../../modules/identity/repo";
import { Database, databaseFailure } from "./client";
type Row = Omit<APIKey, "scopes"> & { scopesJSON: string };
const columns = `id,name,secret_hash AS hash,prefix,scopes AS scopesJSON,status,expires_at AS expiresAt,created_at AS createdAt`;
function decode(r: Row): APIKey {
  try {
    const { scopesJSON, ...key } = r;
    return { ...key, scopes: JSON.parse(scopesJSON) };
  } catch {
    throw databaseFailure();
  }
}
/** 摘要与状态在数据库内原子更新，撤销是不可恢复的终态 */
export function keysRepository(db: Database): KeyRepository {
  async function find(column: "id" | "secret_hash", value: string) {
    const rows = await db.query<Row>(
      `SELECT ${columns} FROM api_keys WHERE ${column}=?`,
      value,
    );
    if (!rows[0]) throw notFound();
    return decode(rows[0]);
  }
  return {
    async listKeys() {
      return (
        await db.query<Row>(
          `SELECT ${columns} FROM api_keys ORDER BY created_at DESC,id DESC`,
        )
      ).map(decode);
    },
    async findKeyByHash(hash) {
      return find("secret_hash", hash);
    },
    async createKey(k) {
      await db.query(
        `INSERT INTO api_keys(id,name,secret_hash,prefix,scopes,status,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?) RETURNING id`,
        k.id,
        k.name,
        k.hash,
        k.prefix,
        JSON.stringify(k.scopes),
        k.status,
        k.expiresAt,
        k.createdAt,
      );
    },
    async setKeyStatus(id, status) {
      validateStatus("enabled", status);
      const rows = await db.query<Row>(
        `UPDATE api_keys SET status=? WHERE id=? AND (status<>'revoked' OR ?='revoked') RETURNING ${columns}`,
        status,
        id,
        status,
      );
      if (rows[0]) return decode(rows[0]);
      await find("id", id);
      throw new Fault("conflict", "已撤销的密钥不能恢复");
    },
    async rotateKey(id, hash, prefix) {
      const rows = await db.query<Row>(
        `UPDATE api_keys SET secret_hash=?,prefix=? WHERE id=? AND status<>'revoked' RETURNING ${columns}`,
        hash,
        prefix,
        id,
      );
      if (rows[0]) return decode(rows[0]);
      await find("id", id);
      throw new Fault("conflict", "已撤销的密钥不能轮换");
    },
  };
}
