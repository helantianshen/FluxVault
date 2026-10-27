import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// 仅对本机 mock 创建测试记录；可传入 HEIC 样本路径验证实际格式提示
const base = "http://127.0.0.1:8791";
const health = await (await fetch(`${base}/healthz`)).json();
assert.equal(health.mode, "mock");
const loginResponse = await fetch(`${base}/admin/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "admin",
    password: process.env.MOCK_ADMIN_PASSWORD || "fluxvault-local-check",
  }),
});
assert.equal(loginResponse.status, 200);
const { access_token: token } = await loginResponse.json();
const auth = { Authorization: `Bearer ${token}` };
const ids = [];
/** 上传测试正文并保留清理所需的 ID */
async function upload(bytes, visibility = "public", type = "image/png") {
  const response = await fetch(
    `${base}/admin/v1/files?name=preview-check.png&instance_id=s3-main&visibility=${visibility}`,
    { method: "POST", headers: { ...auth, "Content-Type": type }, body: bytes },
  );
  assert.equal(response.status, 201);
  const file = await response.json();
  ids.push(file.id);
  return file.id;
}
try {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
    "base64",
  );
  const id = await upload(png, "public", "image/jpeg");
  const path = `${base}/api/v1/files/${id}/preview`;
  const result = await fetch(path);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("content-type"), "image/png");
  assert.equal(result.headers.get("content-disposition"), "inline");
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), png);
  assert.equal(
    (await fetch(path, { headers: { Authorization: "Bearer invalid" } }))
      .status,
    401,
  );
  const privateID = await upload(png, "private");
  assert.equal(
    (await fetch(`${base}/api/v1/files/${privateID}/preview`)).status,
    404,
  );
  assert.equal(
    (
      await fetch(`${base}/admin/v1/files/${privateID}/preview`, {
        headers: auth,
      })
    ).status,
    200,
  );
  const html = await upload(
    new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ),
  );
  assert.equal(
    (await fetch(`${base}/api/v1/files/${html}/preview`)).status,
    422,
  );
  assert.equal(
    (
      await fetch(`${base}/admin/v1/files/mock-pending-upload/preview`, {
        headers: auth,
      })
    ).status,
    409,
  );
  for (const [bytes, format] of [
    [Buffer.from([73, 73, 42, 0]), "image/tiff"],
    [Buffer.from([0, 0, 1, 0]), "image/x-icon"],
    [Buffer.from("%PDF-1.7"), "application/pdf"],
    [Buffer.from([80, 75, 3, 4]), "application/zip"],
    [Buffer.from("not an image"), "未知"],
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/svg+xml"],
    [Buffer.from("00000010667479706d69663100000000", "hex"), "image/heif"],
  ]) {
    const fileID = await upload(bytes);
    const response = await fetch(`${base}/api/v1/files/${fileID}/preview`);
    assert.equal(response.status, 422);
    assert.ok((await response.json()).error.message.includes(format), format);
  }
  if (process.argv[2]) {
    const heic = await readFile(process.argv[2]);
    const heicID = await upload(heic);
    const preview = await fetch(`${base}/api/v1/files/${heicID}/preview`);
    assert.equal(preview.status, 422);
    assert.match((await preview.json()).error.message, /image\/heic/);
    assert.deepEqual(
      Buffer.from(
        await (
          await fetch(`${base}/api/v1/files/${heicID}/content`)
        ).arrayBuffer(),
      ),
      heic,
    );
    console.log(
      "HEIC fixture rejected with detected format; original bytes preserved",
    );
  }
  await fetch(`${base}/admin/v1/files/${id}`, {
    method: "DELETE",
    headers: auth,
  });
  assert.equal((await fetch(path)).status, 404);
  console.log(
    "Preview checks passed: signatures, inline headers, auth, private/pending/deleted denial, SVG rejection",
  );
} finally {
  for (const id of ids)
    await fetch(`${base}/admin/v1/files/${id}`, {
      method: "DELETE",
      headers: auth,
    });
}
