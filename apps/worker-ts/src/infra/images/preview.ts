import { Fault } from "../../fault";

const MAX_BYTES = 8 * 1024 * 1024;

/** 按实际文件签名识别格式，不信任文件名或上传时声明的 MIME */
function imageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 2) === "BM") return "image/bmp";
  if (
    (bytes[0] === 73 && bytes[1] === 73 && bytes[2] === 42 && bytes[3] === 0) ||
    (bytes[0] === 77 && bytes[1] === 77 && bytes[2] === 0 && bytes[3] === 42)
  )
    return "image/tiff";
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0)
    return "image/x-icon";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (
    bytes[0] === 80 &&
    bytes[1] === 75 &&
    ((bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6))
  )
    return "application/zip";
  const text = new TextDecoder().decode(bytes.subarray(0, 4096)).trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(text))
    return "image/svg+xml";
  if (ascii(4, 8) === "ftyp") {
    const size = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).getUint32(0);
    if (size < 16 || size > bytes.length || size > 256) return null;
    const brands = [ascii(8, 12)];
    for (let offset = 16; offset + 4 <= size; offset += 4)
      brands.push(ascii(offset, offset + 4));
    if (brands.some((b) => ["avif", "avis"].includes(b))) return "image/avif";
    if (brands.some((b) => ["heic", "heix", "hevc", "hevx"].includes(b)))
      return "image/heic";
    if (brands.some((b) => ["mif1", "msf1"].includes(b))) return "image/heif";
  }
  return null;
}

/** 校验有界图片正文，按实际格式返回原始字节，不执行转码 */
export async function imagePreview(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BYTES)
        throw new Fault("payload_too_large", "图片预览输入上限为 8 MiB");
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const type = imageType(bytes);
  if (!type)
    throw new Fault(
      "preview_unavailable",
      "实际格式：未知（无法从文件内容识别），不支持预览，请下载查看",
    );
  if (
    ![
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/avif",
      "image/bmp",
    ].includes(type)
  )
    throw new Fault(
      "preview_unavailable",
      `实际格式：${type}，暂不支持预览，请下载查看`,
    );
  return { bytes, type };
}
