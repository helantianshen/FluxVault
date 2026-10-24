import type { Files } from "../modules/file/service";
import type { Instances } from "../modules/storage/service";
import type { Keys } from "../modules/identity/service";
import type { AdminAuthenticator } from "../modules/auth/model";
export interface Services {
  files: Files;
  instances: Instances;
  keys: Keys;
  auth: AdminAuthenticator;
  allowedOrigin: string;
}
