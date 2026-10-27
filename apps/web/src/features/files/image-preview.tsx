import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useSystem } from "../settings/queries";
import { useAuth } from "../auth/auth";
import { errorMessage } from "../../lib/utils";
import type { VaultFile } from "../../api/types";
import { ApiError } from "../../api/client";

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
]);

/** 对就绪文件按内容尝试预览，不以声明的 MIME 排除格式识别 */
export function ImagePreview({ file }: { file: VaultFile }) {
  const [attempt, setAttempt] = useState(0);
  if (file.state !== "ready") return null;
  return (
    <PreviewContent
      key={`${file.id}:${file.updated_at}:${attempt}`}
      file={file}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

/** 使用鉴权正文创建临时图片地址，离开详情时取消请求并释放正文 */
function PreviewContent({
  file,
  onRetry,
}: {
  file: VaultFile;
  onRetry: () => void;
}) {
  const { client } = useAuth();
  const system = useSystem();
  const backend = system.data?.backend;
  const [url, setURL] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [format, setFormat] = useState(
    `上传声明格式：${file.content_type}（未验证实际格式）`,
  );
  useEffect(() => {
    const controller = new AbortController();
    let objectURL = "";
    if (!backend) return;
    const request =
      backend === "worker-ts"
        ? client.preview(file.id, controller.signal)
        : file.content_type.startsWith("image/")
          ? client.download(file.id, controller.signal)
          : Promise.reject(new Error("此格式暂不支持预览，请下载查看"));
    request
      .then((blob) => {
        if (controller.signal.aborted) return;
        setFormat(
          `${backend === "worker-ts" ? "实际格式" : "服务器声明格式"}：${blob.type || "未知"}`,
        );
        if (!imageTypes.has(blob.type))
          throw new Error("此格式暂不支持预览，请下载查看");
        objectURL = URL.createObjectURL(blob);
        setURL(objectURL);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          if (cause instanceof ApiError && cause.code === "preview_unavailable")
            setFormat(`上传声明格式：${file.content_type || "未知"}`);
          setError(errorMessage(cause));
        }
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [client, file.id, file.content_type, backend]);
  return (
    <section
      className="image-preview"
      aria-label="图片预览"
      aria-busy={!loaded && !error}
    >
      {error ? (
        <div className="image-preview-message">
          <p role="alert">预览失败：{error}</p>
          <p>{format}</p>
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw />
            重试预览
          </Button>
        </div>
      ) : (
        <>
          {!loaded && (
            <p className="image-preview-message" role="status">
              正在加载图片…
            </p>
          )}
          {url && (
            <img
              src={url}
              alt={file.name}
              hidden={!loaded}
              onLoad={() => setLoaded(true)}
              onError={() => setError("图片无法解码，请重试或下载查看")}
            />
          )}
        </>
      )}
    </section>
  );
}
