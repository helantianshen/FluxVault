import { z } from "zod";
import { name } from "../../httpx/validation";
export const createInstanceSchema = z.strictObject({
  name,
  provider: z.enum(["s3", "telegram", "github"]),
  secret_ref: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/),
  private_supported: z.boolean(),
});
export const updateInstanceSchema = z
  .strictObject({ name: name.optional(), enabled: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0);
