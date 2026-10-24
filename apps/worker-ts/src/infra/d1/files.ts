import { Fault, notFound } from "../../fault";
import type { VaultFile } from "../../modules/file/model";
import type { FileRepository } from "../../modules/file/repo";
import { acceptUpload } from "../../modules/storage/policy";
import { instancesRepository } from "./instances";
import { Database, databaseFailure } from "./client";
type Row = Omit<VaultFile, "locator"> & { locatorJSON: string | null };
const columns = `id,name,content_type AS contentType,size,instance_id AS instanceID,COALESCE(owner_key_id,'system') AS ownerID,visibility,state,locator_json AS locatorJSON,last_error AS lastError,created_at AS createdAt,updated_at AS updatedAt`;
function decode(r: Row): VaultFile {
  try {
    const { locatorJSON, ...file } = r;
    return {
      ...file,
      locator: locatorJSON === null ? null : JSON.parse(locatorJSON),
    };
  } catch {
    throw databaseFailure();
  }
}
/** 条件 SQL 保证实例能力、状态流转及删除幂等；计数与分页共用事务快照 */
export function filesRepository(db: Database): FileRepository {
  async function find(id: string) {
    const rows = await db.query<Row>(
      `SELECT ${columns} FROM files WHERE id=?`,
      id,
    );
    if (!rows[0]) throw notFound();
    return decode(rows[0]);
  }
  async function transition(
    id: string,
    sql: string,
    params: (string | number | null)[],
    message: string,
  ) {
    const rows = await db.query<Row>(sql, ...params);
    if (rows[0]) return decode(rows[0]);
    await find(id);
    throw new Fault("conflict", message);
  }
  return {
    async createFile(f) {
      const system = f.ownerID === "system";
      const rows = await db.query<Row>(
        `INSERT INTO files(id,name,name_search,content_type,size,instance_id,owner_key_id,owner_kind,visibility,state,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? FROM storage_instances WHERE id=? AND enabled=1 AND (? <> 'private' OR (private_supported=1 AND provider <> 'github')) ON CONFLICT(id) DO NOTHING RETURNING ${columns}`,
        f.id,
        f.name,
        f.name.toLowerCase(),
        f.contentType,
        f.size,
        f.instanceID,
        system ? null : f.ownerID,
        system ? "system" : "api_key",
        f.visibility,
        f.state,
        f.createdAt,
        f.updatedAt,
        f.instanceID,
        f.visibility,
      );
      if (rows.length) return;
      acceptUpload(
        await instancesRepository(db).findInstance(f.instanceID),
        f.visibility,
      );
      throw new Fault("conflict", "文件已存在");
    },
    findFile: find,
    async listFiles(f) {
      const clauses = ["instr(name_search,?) > 0"];
      const params: (string | number | null)[] = [f.q.toLowerCase()];
      for (const [column, value] of [
        ["state", f.state],
        ["visibility", f.visibility],
        ["instance_id", f.instanceID],
        ["COALESCE(owner_key_id,'system')", f.ownerID],
      ]) {
        if (value) {
          clauses.push(`${column}=?`);
          params.push(value);
        }
      }
      const where = ` FROM files WHERE ${clauses.join(" AND ")}`;
      const results = await db.batch([
        { sql: `SELECT count(*) AS total${where}`, params },
        {
          sql: `SELECT ${columns}${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
          params: [...params, f.limit, f.offset],
        },
      ]);
      const count = results[0]?.results as { total: number }[];
      const data = results[1]?.results as Row[];
      if (!count[0] || !data) throw databaseFailure();
      return {
        items: data.map(decode),
        total: count[0].total,
        limit: f.limit,
        offset: f.offset,
      };
    },
    async completeFile(id, locator, size) {
      return transition(
        id,
        `UPDATE files SET locator_json=?,size=?,state='ready',last_error='',updated_at=? WHERE id=? AND state='pending' RETURNING ${columns}`,
        [JSON.stringify(locator), size, new Date().toISOString(), id],
        "只有待完成文件可以确认上传",
      );
    },
    async recordFailure(id, code) {
      const rows = await db.query<Row>(
        `UPDATE files SET last_error=?,updated_at=? WHERE id=? RETURNING ${columns}`,
        code,
        new Date().toISOString(),
        id,
      );
      if (!rows.length) throw notFound();
    },
    async beginDelete(id) {
      return transition(
        id,
        `UPDATE files SET state='deleting',updated_at=? WHERE id=? AND state IN ('ready','deleting') RETURNING ${columns}`,
        [new Date().toISOString(), id],
        "待完成文件需先排查远端状态",
      );
    },
    async removeFile(id) {
      const rows = await db.query<Row>(
        `DELETE FROM files WHERE id=? AND state='deleting' RETURNING ${columns}`,
        id,
      );
      if (rows.length) return;
      try {
        await find(id);
      } catch (error) {
        if (error instanceof Fault && error.code === "not_found") return;
        throw error;
      }
      throw new Fault("conflict", "文件尚未进入删除状态");
    },
  };
}
