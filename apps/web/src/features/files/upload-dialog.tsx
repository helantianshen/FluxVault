import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Upload, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { ApiError } from "../../api/client";
import type { VaultFile } from "../../api/types";
import { useAuth } from "../auth/auth";
import { useInstances } from "../instances/queries";
import { providerLabels } from "../instances/instance-presentation";
import { useSystem } from "../settings/queries";
import { errorMessage, formatBytes } from "../../lib/utils";
interface UploadForm {
  instance: string;
  visibility: "private" | "public";
}
export function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (file: VaultFile) => void;
}) {
  const { client } = useAuth();
  const cache = useQueryClient();
  const instances = useInstances();
  const system = useSystem();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<UploadForm>({
    defaultValues: { instance: "s3-main", visibility: "private" },
  });
  const mutation = useMutation({
    mutationFn: async (values: UploadForm) => {
      if (!file) throw new Error("请先选择文件");
      if (!system.data) throw new Error("正在读取上传限制，请稍后再试");
      if (file.size > system.data.max_file_bytes)
        throw new Error(
          `当前单文件上限为 ${formatBytes(system.data.max_file_bytes)}`,
        );
      const selected = instances.data?.items.find(
        (i) => i.id === values.instance,
      );
      if (!selected?.enabled) throw new Error("请选择已启用的存储实例");
      if (values.visibility === "private" && !selected.private_supported)
        throw new Error("该实例不能承载私有文件，请更换实例或选择公开");
      return client.request<VaultFile>(
        `/files?${new URLSearchParams({ name: file.name, instance_id: values.instance, visibility: values.visibility })}`,
        {
          method: "POST",
          body: file,
          headers: {
            "Content-Type":
              file.type ||
              (/\.heic$/i.test(file.name)
                ? "image/heic"
                : /\.heif$/i.test(file.name)
                  ? "image/heif"
                  : "application/octet-stream"),
          },
        },
      );
    },
    onSuccess: (result) => {
      void cache.invalidateQueries({ queryKey: ["files"] });
      toast.success("文件上传完成");
      onUploaded(result);
      setFile(null);
      onOpenChange(false);
    },
    onError: (error) => {
      setError(
        errorMessage(error) +
          (error instanceof ApiError && error.fileID
            ? `（待排查记录：${error.fileID}）`
            : ""),
      );
      void cache.invalidateQueries({ queryKey: ["files"] });
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) {
          onOpenChange(value);
          setError("");
          if (!value) setFile(null);
        }
      }}
      title="上传文件"
      description="选择目标实例和文件可见性。"
    >
      <form
        onSubmit={form.handleSubmit((values) => {
          setError("");
          mutation.mutate(values);
        })}
      >
        <label
          className={`dropzone ${dragOver ? "is-dragover" : ""}`}
          onDragOver={(event) => {
            if (mutation.isPending) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node))
              return;
            setDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (mutation.isPending) return;
            const dropped = event.dataTransfer.files[0];
            if (dropped) {
              setFile(dropped);
              setError("");
            }
          }}
        >
          <CloudUpload />
          <strong>{file ? file.name : "选择文件，或拖放到这里"}</strong>
          <span>
            {file
              ? formatBytes(file.size)
              : `单文件上限 ${formatBytes(system.data?.max_file_bytes ?? 8388608)}`}
          </span>
          <input
            aria-label="选择上传文件"
            type="file"
            disabled={mutation.isPending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
            }}
          />
        </label>
        <label className="field-label" htmlFor="upload-instance">
          目标存储实例
        </label>
        <Select
          id="upload-instance"
          label="目标存储实例"
          value={form.watch("instance")}
          onValueChange={(value) => form.setValue("instance", value)}
          disabled={mutation.isPending}
          items={
            instances.data?.items
              .filter((i) => i.enabled)
              .map((i) => ({
                value: i.id,
                label: `${i.name} · ${providerLabels[i.provider]}`,
              })) ?? []
          }
        />
        <fieldset className="visibility-options" disabled={mutation.isPending}>
          <legend>文件可见性</legend>
          <label>
            <input
              type="radio"
              value="private"
              {...form.register("visibility")}
            />
            <span>
              <strong>私有</strong>
              <small>仅所属 API Key 和管理员可访问</small>
            </span>
            <Lock />
          </label>
          <label>
            <input
              type="radio"
              value="public"
              {...form.register("visibility")}
            />
            <span>
              <strong>公开</strong>
              <small>任何持有文件地址的人均可下载</small>
            </span>
            <Globe />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {mutation.isPending && (
          <div className="upload-progress" role="status">
            <p>
              <span />
              正在上传并确认文件，请稍候…
            </p>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" />
            </div>
          </div>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || instances.isLoading || !system.data}
          >
            {mutation.isPending ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <Upload />
            )}
            {mutation.isPending ? "上传中…" : "开始上传"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
