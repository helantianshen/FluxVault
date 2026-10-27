import type { Files } from "../modules/file/service";
import type { Instances } from "../modules/storage/service";
import type { Keys } from "../modules/identity/service";
import type { AdminAuthenticator } from "../modules/auth/model";
import type { ImagePreviewer } from "../modules/file/model";
export interface Services {
  preview?: ImagePreviewer;
  files: Files;
  instances: Instances;
  keys: Keys;
  auth: AdminAuthenticator;
  allowedOrigin: string;
  mode?: "mock" | "d1";
}
