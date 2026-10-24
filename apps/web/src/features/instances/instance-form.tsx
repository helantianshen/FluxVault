import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { useAuth } from "../auth/auth";
import { errorMessage } from "../../lib/utils";
const schema = z.object({
  name: z.string().trim().min(1, "请输入名称").max(120),
  provider: z.enum(["s3", "telegram", "github"]),
  secret_ref: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]{0,63}$/, "Secret 引用需使用大写字母、数字和下划线"),
  private_supported: z.boolean(),
});
export function InstanceForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { client } = useAuth();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      provider: "s3",
      secret_ref: "",
      private_supported: true,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      client.json("/instances", "POST", values),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["instances"] });
      toast.success("存储实例已添加");
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => setError(errorMessage(error)),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) {
          onOpenChange(value);
          setError("");
        }
      }}
      title="添加存储实例"
      description="当前使用 Mock 适配器，凭据仅保存引用名称。"
    >
      <form
        onSubmit={form.handleSubmit((values) => {
          setError("");
          mutation.mutate(values);
        })}
      >
        <label className="field-label" htmlFor="instance-name">
          实例名称
        </label>
        <input
          id="instance-name"
          placeholder="例如：归档存储"
          {...form.register("name")}
        />
        <label className="field-label" htmlFor="instance-provider">
          存储源
        </label>
        <Select
          id="instance-provider"
          label="存储源"
          value={form.watch("provider")}
          onValueChange={(value) =>
            form.setValue(
              "provider",
              value as z.infer<typeof schema>["provider"],
            )
          }
          items={[
            { value: "s3", label: "S3 兼容" },
            { value: "telegram", label: "Telegram" },
            { value: "github", label: "GitHub Releases" },
          ]}
        />
        <label className="field-label" htmlFor="secret-ref">
          Secret 引用
        </label>
        <input
          id="secret-ref"
          placeholder="例如 S3_ARCHIVE"
          autoComplete="off"
          {...form.register("secret_ref")}
        />
        <label className="checkbox-label">
          <input type="checkbox" {...form.register("private_supported")} />
          <span>此实例具备私有访问控制</span>
        </label>
        <p className="field-hint">
          公开 GitHub 仓库不能承载私有文件，请取消此项。
        </p>
        {(error || Object.values(form.formState.errors)[0]) && (
          <p className="form-error" role="alert">
            {error || Object.values(form.formState.errors)[0]?.message}
          </p>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            取消
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <span className="spinner" aria-hidden="true" />
            )}
            {mutation.isPending ? "保存中…" : "添加实例"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
