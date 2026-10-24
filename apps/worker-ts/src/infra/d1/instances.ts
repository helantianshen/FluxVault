import { Fault, notFound } from "../../fault";
import type { Instance } from "../../modules/storage/model";
import type { InstanceRepository } from "../../modules/storage/repo";
import type { Database } from "./client";
type Row = Omit<Instance, "enabled" | "privateSupported"> & {
  enabled: number;
  privateSupported: number;
};
const columns = `id,name,provider,secret_ref AS secretRef,private_supported AS privateSupported,enabled,created_at AS createdAt`;
function decode(r: Row): Instance {
  return { ...r, enabled: !!r.enabled, privateSupported: !!r.privateSupported };
}
/** 实例读写与条件删除使用参数绑定，外键约束防止悬空文件 */
export function instancesRepository(db: Database): InstanceRepository {
  return {
    async listInstances() {
      return (
        await db.query<Row>(
          `SELECT ${columns} FROM storage_instances ORDER BY id`,
        )
      ).map(decode);
    },
    async findInstance(id) {
      const rows = await db.query<Row>(
        `SELECT ${columns} FROM storage_instances WHERE id=?`,
        id,
      );
      if (!rows[0]) throw notFound();
      return decode(rows[0]);
    },
    async createInstance(i) {
      const rows = await db.query<Row>(
        `INSERT INTO storage_instances(id,name,provider,secret_ref,private_supported,enabled,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING ${columns}`,
        i.id,
        i.name,
        i.provider,
        i.secretRef,
        Number(i.privateSupported),
        Number(i.enabled),
        i.createdAt,
      );
      if (!rows.length) throw new Fault("conflict", "实例已存在");
    },
    async updateInstance(id, input) {
      const rows = await db.query<Row>(
        `UPDATE storage_instances SET name=COALESCE(?,name),enabled=COALESCE(?,enabled) WHERE id=? RETURNING ${columns}`,
        input.name ?? null,
        input.enabled === undefined ? null : Number(input.enabled),
        id,
      );
      if (!rows[0]) throw notFound();
      return decode(rows[0]);
    },
    async removeInstance(id) {
      const rows = await db.query<Row>(
        `DELETE FROM storage_instances WHERE id=? AND NOT EXISTS(SELECT 1 FROM files WHERE instance_id=?) RETURNING ${columns}`,
        id,
        id,
      );
      if (rows.length) return;
      await this.findInstance(id);
      throw new Fault("conflict", "实例仍有关联文件，不能删除");
    },
  };
}
