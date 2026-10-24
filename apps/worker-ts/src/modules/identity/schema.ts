import { z } from "zod";
import { name } from "../../httpx/validation";
export const createKeySchema = z.strictObject({
  name,
  scopes: z
    .array(z.enum(["upload", "read", "delete"]))
    .min(1)
    .max(3),
  expires_at: z.iso.datetime({ offset: true }).nullable().default(null),
});
export const updateKeySchema = z.strictObject({
  status: z.enum(["enabled", "disabled", "revoked"]),
});
