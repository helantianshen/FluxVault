import type { VaultFile } from "./model";
export const fileDTO = (f: VaultFile) => ({
  id: f.id,
  name: f.name,
  content_type: f.contentType,
  size: f.size,
  instance_id: f.instanceID,
  owner_id: f.ownerID,
  visibility: f.visibility,
  state: f.state,
  last_error: f.lastError,
  created_at: f.createdAt,
  updated_at: f.updatedAt,
});
