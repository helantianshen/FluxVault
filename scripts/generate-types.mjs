import openapiTS, { astToString } from "openapi-typescript";
import { writeFileSync, mkdirSync } from "node:fs";
const ast = await openapiTS(
  new URL("../contracts/admin.openapi.yaml", import.meta.url),
);
const source = astToString(ast).replace(
  /^(\s*\*[^\n]*?)[，、；：。]\s*$/gm,
  "$1",
);
const directory = new URL("../apps/web/src/api/", import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(
  new URL("schema.d.ts", directory),
  "/** 此文件由 OpenAPI 契约自动生成，禁止手动编辑 */\n" + source,
);
