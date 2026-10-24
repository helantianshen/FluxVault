export type Provider = "s3" | "telegram" | "github";
export interface Instance {
  id: string;
  name: string;
  provider: Provider;
  privateSupported: boolean;
  secretRef: string;
  enabled: boolean;
  createdAt: string;
}
export interface Locator {
  objectKey: string;
}

export interface CreateInstance {
  name: string;
  provider: Provider;
  secretRef: string;
  privateSupported: boolean;
}
