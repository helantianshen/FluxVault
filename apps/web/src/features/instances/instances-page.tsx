import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Dialog } from "../../components/ui/dialog";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";
import { useInstances } from "./queries";
import { providerLabels } from "./instance-presentation";
import { useAuth } from "../auth/auth";
import { InstanceForm } from "./instance-form";
import type { Instance } from "../../api/types";
import { errorMessage } from "../../lib/utils";
export function InstancesPage() {
  const { client } = useAuth();
  const cache = useQueryClient();
  const query = useInstances();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Instance | null>(null);
  const [editing, setEditing] = useState<Instance | null>(null);
  const [name, setName] = useState("");
  const change = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { name?: string; enabled?: boolean };
    }) => client.json(`/instances/${id}`, "PATCH", values),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["instances"] });
      setEditing(null);
      toast.success("实例已更新");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      client.request(`/instances/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["instances"] });
      setRemoving(null);
      toast.success("实例已删除");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>存储实例</h1>
          <p>把不同存储服务，接入同一个工作空间。</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          添加实例
        </Button>
      </div>
      <div className="section-intro">
        <h2>已配置的实例</h2>
        <p>禁用会停止新上传，已有文件仍可读取和删除。</p>
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
          title="还没有存储实例"
          description="先添加一个实例，再上传文件。"
        />
      ) : (
        <div className="table-scroll surface-table">
          <table>
            <thead>
              <tr>
                <th>实例名称</th>
                <th>存储源</th>
                <th>访问策略</th>
                <th>凭据引用</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((instance) => (
                <tr key={instance.id}>
                  <td>
                    <span className="filename">{instance.name}</span>
                    <span className="file-date mono">{instance.id}</span>
                  </td>
                  <td>{providerLabels[instance.provider]}</td>
                  <td>
                    {instance.private_supported ? "支持私有" : "仅限公开"}
                  </td>
                  <td className="mono">{instance.secret_ref}</td>
                  <td>
                    <span
                      className={`badge ${instance.enabled ? "ready" : "disabled"}`}
                    >
                      {instance.enabled ? "已启用" : "已禁用"} · 模拟
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button
                        variant="ghost"
                        disabled={change.isPending}
                        onClick={() =>
                          change.mutate({
                            id: instance.id,
                            values: { enabled: !instance.enabled },
                          })
                        }
                      >
                        {instance.enabled ? "禁用" : "启用"}
                      </Button>
                      <button
                        className="icon-button"
                        aria-label={`重命名 ${instance.name}`}
                        onClick={() => {
                          setEditing(instance);
                          setName(instance.name);
                        }}
                      >
                        <Pencil />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`删除实例 ${instance.name}`}
                        onClick={() => setRemoving(instance)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="inline-note">
        <ShieldCheck />
        实例只保存 Secret 名称。真实服务接入将在配置凭据后单独验收。
      </div>
      <InstanceForm open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={`删除实例 ${removing?.name ?? ""}？`}
        description="有关联文件的实例无法删除。请先处理所有文件记录。"
        busy={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="重命名实例"
        description="只修改显示名称，文件绑定关系保持不变。"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (editing && name.trim())
              change.mutate({ id: editing.id, values: { name } });
          }}
        >
          <label className="field-label" htmlFor="rename-instance">
            名称
          </label>
          <input
            id="rename-instance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
          <div className="dialog-actions">
            <Button disabled={change.isPending || !name.trim()} type="submit">
              保存名称
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
