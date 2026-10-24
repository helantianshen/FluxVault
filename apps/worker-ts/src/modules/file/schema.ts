import { z } from "zod";
import { bytes } from "../../httpx/validation";
export const uploadQuery = z.strictObject({
  name: z.string(),
  instance_id: z.string(),
  visibility: z.enum(["private", "public"]).default("private"),
});
export const downloadQuery = z.strictObject({
  mode: z.enum(["auto", "direct", "proxy"]).default("auto"),
});
export const fileFilterSchema = z.strictObject({
  q: z
    .string()
    .refine((s) => bytes(s) <= 50)
    .default(""),
  state: z.enum(["pending", "ready", "deleting"]).optional(),
  visibility: z.enum(["private", "public"]).optional(),
  instance_id: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(50),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(100000))
    .default(0),
});
