import { z } from "zod";
import { bytes } from "../../httpx/validation";
export const loginSchema = z.strictObject({
  username: z
    .string()
    .min(1)
    .refine((s) => bytes(s) <= 120),
  password: z
    .string()
    .min(1)
    .refine((s) => bytes(s) <= 72),
});
