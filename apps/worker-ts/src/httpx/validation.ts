import { z } from "zod";
import type { Context } from "hono";
import { Fault } from "../fault";
export const bytes = (s: string) => new TextEncoder().encode(s).length;
export const name = z
  .string()
  .trim()
  .min(1)
  .refine((s) => bytes(s) <= 120);
/** 拒绝重复查询字段，再按模块提供的 Schema 解析输入 */
export function query<T>(c: Context, schema: z.ZodType<T>): T {
  const values = new URL(c.req.url).searchParams;
  for (const key of values.keys())
    if (values.getAll(key).length !== 1)
      throw new Fault("invalid_request", "查询参数重复");
  return schema.parse(Object.fromEntries(values));
}
/** 有界读取 UTF-8 JSON，请求体类型、编码与字段必须同时通过校验 */
export async function json<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  if (
    c.req.header("Content-Type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  )
    throw new Fault("invalid_request", "请求体必须为 JSON");
  const reader = c.req.raw.body?.getReader();
  if (!reader) throw new Fault("invalid_request", "JSON 请求体不能为空");
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let text = "";
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 16384) throw new Fault("invalid_request", "JSON 请求体过大");
      text += decoder.decode(next.value, { stream: true });
    }
    text += decoder.decode();
    return schema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError)
      throw new Fault("invalid_request", "JSON 格式或字符编码无效");
    throw error;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
