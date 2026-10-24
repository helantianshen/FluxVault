import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LockKeyhole, Copy, RotateCw } from "lucide-react";
import { toast } from "sonner";
import type { APIKey, KeySecret } from "../../api/types";
import { useAuth } from "../auth/auth";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";
import { errorMessage, formatTime } from "../../lib/utils";
import { KeyForm } from "./key-form";
import { KeyStatusBadge } from "./key-presentation";
export function KeysPage() {
  const { client } = useAuth();
  const cache = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<KeySecret | null>(null);
  const [confirm, setConfirm] = useState<{
    key: APIKey;
    action: "revoke" | "rotate";
  } | null>(null);
  const query = useQuery({
    queryKey: ["keys"],
    queryFn: ({ signal }) =>
      client.request<{ items: APIKey[] }>("/keys", { signal }),
  });
  const status = useMutation({
    mutationFn: ({ id, status }: { id: string; status: APIKey["status"] }) =>
      client.json(`/keys/${id}`, "PATCH", { status }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["keys"] });
      setConfirm(null);
      toast.success("密钥状态已更新");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const rotate = useMutation({
    mutationFn: (id: string) =>
      client.json<KeySecret>(`/keys/${id}/rotate`, "POST"),
    onSuccess: (value) => {
      void cache.invalidateQueries({ queryKey: ["keys"] });
      setConfirm(null);
      setSecret(value);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>API Key</h1>
          <p>为每个调用方分配独立的访问权限。</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          创建密钥
        </Button>
      </div>
      <div className="section-intro">
        <h2>调用方密钥</h2>
        <p>文件归属跟随 Key ID，轮换密钥不会改变归属。</p>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState
          message={errorMessage(query.error)}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : !query.data.items.length ? (
        <EmptyState
          title="还没有 API Key"
          description="创建一个密钥，让外部程序开始上传和管理文件。"
        />
      ) : (
        <div className="table-scroll surface-table">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>密钥前缀</th>
                <th>权限</th>
                <th>有效期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((key) => (
                <tr key={key.id}>
                  <td>
                    <span className="filename">{key.name}</span>
                    <span className="file-date">
                      创建于 {formatTime(key.created_at)}
                    </span>
                  </td>
                  <td className="mono">{key.prefix}…</td>
                  <td>
                    <div className="scope-tags">
                      {key.scopes.map((scope) => (
                        <code key={scope}>{scope}</code>
                      ))}
                    </div>
                  </td>
                  <td>
                    {key.expires_at ? formatTime(key.expires_at) : "永不过期"}
                  </td>
                  <td>
                    <KeyStatusBadge apiKey={key} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button
                        variant="ghost"
                        disabled={key.status === "revoked" || status.isPending}
                        onClick={() =>
                          status.mutate({
                            id: key.id,
                            status:
                              key.status === "enabled" ? "disabled" : "enabled",
                          })
                        }
                      >
                        {key.status === "disabled" ? "启用" : "禁用"}
                      </Button>
                      <button
                        className="icon-button"
                        aria-label={`轮换 ${key.name}`}
                        disabled={key.status === "revoked"}
                        onClick={() => setConfirm({ key, action: "rotate" })}
                      >
                        <RotateCw />
                      </button>
                      <Button
                        variant="ghost"
                        disabled={key.status === "revoked"}
                        onClick={() => setConfirm({ key, action: "revoke" })}
                      >
                        撤销
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="inline-note">
        <LockKeyhole />
        API Key 用于 Public
        API，不具备管理员权限。禁用、撤销或过期后，下次请求即被拒绝。
      </div>
      <KeyForm
        open={creating}
        onOpenChange={setCreating}
        onCreated={setSecret}
      />
      <Dialog
        open={!!secret}
        onOpenChange={(open) => {
          if (!open) setSecret(null);
        }}
        title="保存你的密钥"
        description="密钥原文只显示这一次。关闭后无法再次查看，请保存到安全位置。"
      >
        <div className="secret-result">
          <strong>{secret?.api_key.name}</strong>
          <code data-testid="one-time-secret">{secret?.secret}</code>
          <Button
            variant="secondary"
            onClick={() => {
              if (secret)
                navigator.clipboard
                  .writeText(secret.secret)
                  .then(() => toast.success("密钥已复制"))
                  .catch(() => toast.error("复制失败，请手动选择密钥"));
            }}
          >
            <Copy />
            复制密钥
          </Button>
        </div>
        <div className="dialog-actions">
          <Button onClick={() => setSecret(null)}>已保存，关闭</Button>
        </div>
      </Dialog>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm?.action === "rotate"
            ? `轮换 ${confirm.key.name}？`
            : `撤销 ${confirm?.key.name ?? ""}？`
        }
        description={
          confirm?.action === "rotate"
            ? "旧密钥会立即失效。Key ID 和已有文件归属保持不变。"
            : "撤销后永久无法恢复。文件仍然保留，管理员可以继续管理。"
        }
        label={confirm?.action === "rotate" ? "确认轮换" : "永久撤销"}
        busy={status.isPending || rotate.isPending}
        onConfirm={() => {
          if (confirm?.action === "rotate") rotate.mutate(confirm.key.id);
          else if (confirm)
            status.mutate({ id: confirm.key.id, status: "revoked" });
        }}
      />
    </>
  );
}
