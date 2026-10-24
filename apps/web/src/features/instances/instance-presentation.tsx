import { Database, Send, GitBranch } from "lucide-react";
import type { Instance } from "../../api/types";

export const providerLabels = {
  s3: "S3 兼容",
  telegram: "Telegram",
  github: "GitHub Releases",
};
// 根据实例 Provider 显示图标和名称，关联缺失时显示明确的占位内容
export function ProviderLabel({ instance }: { instance?: Instance }) {
  if (!instance) return <span>未知实例</span>;
  const Icon = { s3: Database, telegram: Send, github: GitBranch }[
    instance.provider
  ];
  return (
    <span className="provider-name">
      <Icon />
      {instance.name}
    </span>
  );
}
