import { FileText, FileArchive, FileImage, File } from "lucide-react";
import type { VaultFile } from "../../api/types";
export const stateLabels = {
  pending: "待完成",
  ready: "可用",
  deleting: "删除中",
};
export function FileIcon({ file }: { file: VaultFile }) {
  const image = file.content_type.startsWith("image/");
  const archive = /zip|tar|gz|rar/i.test(file.name.split(".").pop() ?? "");
  const document = /text|pdf|json/.test(file.content_type);
  const Icon = image
    ? FileImage
    : archive
      ? FileArchive
      : document
        ? FileText
        : File;
  return (
    <span
      className={`file-icon ${image ? "image" : archive ? "archive" : "document"}`}
    >
      <Icon />
    </span>
  );
}
export function FileBadge({ file }: { file: VaultFile }) {
  return (
    <span className={`badge ${file.state}`}>{stateLabels[file.state]}</span>
  );
}
