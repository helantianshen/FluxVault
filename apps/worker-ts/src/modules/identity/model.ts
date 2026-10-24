export type Scope = "upload" | "read" | "delete";
export type KeyStatus = "enabled" | "disabled" | "revoked";
export interface Principal {
  admin: boolean;
  keyID?: string;
  scopes: Scope[];
}
export interface APIKey {
  id: string;
  name: string;
  hash: string;
  prefix: string;
  scopes: Scope[];
  status: KeyStatus;
  expiresAt: string | null;
  createdAt: string;
}
export const anonymous: Principal = { admin: false, scopes: [] };
export const administrator: Principal = { admin: true, scopes: [] };

export interface CreateKey {
  name: string;
  scopes: Scope[];
  expiresAt: string | null;
}
