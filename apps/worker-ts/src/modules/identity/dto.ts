import type { APIKey } from "./model";
export const keyDTO = (k: APIKey) => ({
  id: k.id,
  name: k.name,
  prefix: k.prefix,
  scopes: k.scopes,
  status: k.status,
  expires_at: k.expiresAt,
  created_at: k.createdAt,
});
