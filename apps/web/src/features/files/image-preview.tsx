import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../auth/auth";
import { errorMessage } from "../../lib/utils";
import type { VaultFile } from "../../api/types";

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
]);

/** 仅为就绪的常见位图提供预览，其他图片保留下载入口 */
export function ImagePreview({ file }: { file: VaultFile }) {
  const [attempt, setAttempt] = useState(0);
  if (file.state !== "ready" || !file.content_type.startsWith("image/"))
    return null;
  if (!imageTypes.has(file.content_type))
    return <p className="detail-help">此图片格式暂不支持预览，请下载查看。</p>;
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
  const [url, setURL] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let objectURL = "";
    client
      .download(file.id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        if (!imageTypes.has(blob.type))
          throw new Error("返回内容不是支持预览的图片格式");
        objectURL = URL.createObjectURL(blob);
        setURL(objectURL);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [client, file.id]);
  return (
    <section
      className="image-preview"
      aria-label="图片预览"
      aria-busy={!loaded && !error}
    >
      {error ? (
        <div className="image-preview-message">
          <p role="alert">预览失败：{error}</p>
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
