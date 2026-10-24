import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  CircleAlert,
  Download,
  Trash2,
  RotateCw,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FileIcon, FileBadge } from "./file-presentation";
import { providerLabels } from "../instances/instance-presentation";
import { formatBytes, formatTime, errorMessage } from "../../lib/utils";
import type { Instance, VaultFile } from "../../api/types";
import { useAuth } from "../auth/auth";
export function FileDetails({
  file,
  instance,
  onDeleted,
}: {
  file: VaultFile;
  instance?: Instance;
  onDeleted: () => void;
}) {
  const { client } = useAuth();
  const cache = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const remove = useMutation({
    mutationFn: () => client.request(`/files/${file.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("文件记录已删除");
      setConfirm(false);
      void cache.invalidateQueries({ queryKey: ["files"] });
      onDeleted();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      void cache.invalidateQueries({ queryKey: ["files"] });
    },
  });
  const download = useMutation({
    mutationFn: () => client.download(file.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <>
      <div className="detail-hero">
        <FileIcon file={file} />
        <h2>{file.name}</h2>
        <FileBadge file={file} />
      </div>
      <dl className="detail-meta">
        <div>
          <dt>文件 ID</dt>
          <dd className="mono copy-id">
            <span>{file.id}</span>
            <button
              className="icon-button"
              aria-label="复制文件 ID"
              onClick={() => {
                navigator.clipboard
                  .writeText(file.id)
                  .then(() => toast.success("文件 ID 已复制"))
                  .catch(() => toast.error("复制失败，请手动选中文件 ID"));
              }}
            >
              <Copy />
            </button>
          </dd>
        </div>
        <div>
          <dt>存储实例</dt>
          <dd>{instance?.name ?? file.instance_id}</dd>
        </div>
        <div>
          <dt>存储源</dt>
          <dd>{instance ? providerLabels[instance.provider] : "未知"}</dd>
        </div>
        <div>
          <dt>文件大小</dt>
          <dd className="mono">{formatBytes(file.size)}</dd>
        </div>
        <div>
          <dt>可见性</dt>
          <dd>
            {file.visibility === "private"
              ? "私有 · 需要授权"
              : "公开 · 可匿名下载"}
          </dd>
        </div>
        <div>
          <dt>所有者</dt>
          <dd>{file.owner_id === "system" ? "系统管理员" : file.owner_id}</dd>
        </div>
      </dl>
      <div className="lifecycle">
        <h3>文件状态</h3>
        <div className="timeline-item">
          <CircleCheck />
          <div>
            已创建文件记录<span>{formatTime(file.created_at)}</span>
          </div>
        </div>
        <div className="timeline-item">
          {file.state === "ready" ? <CircleCheck /> : <CircleAlert />}
          <div>
            {file.state === "ready"
              ? "上传完成，可供访问"
              : file.state === "deleting"
                ? "删除尚未完成"
                : "上传尚未确认"}
            <span>
              {file.state === "ready"
                ? "远端内容与元数据已确认"
                : "当前不可下载"}
            </span>
          </div>
        </div>
      </div>
      {file.state !== "ready" && (
        <div className="detail-warning">
          {file.state === "pending"
            ? "此文件尚未确认完成。请核对远端状态，不能直接标记为可用。"
            : "文件仍处于删除中，可重新执行删除。"}
          {file.last_error && (
            <span className="error-code">错误代码：{file.last_error}</span>
          )}
        </div>
      )}
      <div className="detail-actions">
        <Button
          variant="secondary"
          disabled={file.state !== "ready" || download.isPending}
          onClick={() => download.mutate()}
        >
          <Download />
          {download.isPending ? "下载中…" : "下载文件"}
        </Button>
        {file.state !== "pending" && (
          <Button
            variant={file.state === "deleting" ? "danger" : "secondary"}
            onClick={() => setConfirm(true)}
          >
            {file.state === "deleting" ? <RotateCw /> : <Trash2 />}
            {file.state === "deleting" ? "重试删除" : "删除"}
          </Button>
        )}
      </div>
      <p className="detail-help">
        {instance?.provider === "telegram"
          ? "Telegram 删除只移除文件记录，远端内容会保留。"
          : "删除时先移除远端内容，再清理文件记录。"}
      </p>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`删除 ${file.name}？`}
        description={
          instance?.provider === "telegram"
            ? "此操作移除元数据，Telegram 远端内容保留。文件记录无法恢复。"
            : "将先删除远端内容，再清理文件记录。此操作无法撤销。"
        }
        onConfirm={() => remove.mutate()}
        busy={remove.isPending}
      />
    </>
  );
}
