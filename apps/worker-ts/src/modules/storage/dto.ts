import type { Instance } from "./model";
export const instanceDTO = (i: Instance) => ({
  id: i.id,
  name: i.name,
  provider: i.provider,
  private_supported: i.privateSupported,
  secret_ref: i.secretRef,
  enabled: i.enabled,
  created_at: i.createdAt,
});
