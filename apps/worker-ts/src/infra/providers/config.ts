import { z } from "zod";
import type { S3Config, GitHubConfig, TelegramConfig } from "./model";

export const objectID = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
const repositoryPart = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/);
const nonempty = z.string().refine((value) => value.trim().length > 0);
export const s3Config = z.strictObject({
  endpoint: z
    .string()
    .url()
    .refine((raw) => {
      const url = new URL(raw);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === "/"
      );
    })
    .transform((value) => value.replace(/\/$/, "")),
  region: nonempty,
  bucket: repositoryPart,
  access_key: nonempty,
  secret_key: nonempty,
  session_token: z.string().optional(),
  prefix: z
    .string()
    .regex(/^[A-Za-z0-9_/-]*$/)
    .default("")
    .transform((value) => value.replace(/^\/+|\/+$/g, "")),
}) satisfies z.ZodType<S3Config>;
export const githubConfig = z.strictObject({
  owner: repositoryPart,
  repo: repositoryPart,
  release_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  token: nonempty,
}) satisfies z.ZodType<GitHubConfig>;
export const telegramConfig = z.strictObject({
  bot_token: z.string().regex(/^[1-9][0-9]*:[A-Za-z0-9_-]+$/),
  chat_id: z.string().regex(/^-?[1-9][0-9]*$/),
}) satisfies z.ZodType<TelegramConfig>;
export const remoteLocator = z.strictObject({
  v: z.literal(1),
  provider: z.enum(["s3", "github", "telegram"]),
  instance: z.string().min(1),
  target: z.string().min(1),
  key: z.string().min(1),
});
