import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { useAuth } from "../auth/auth";
import { errorMessage } from "../../lib/utils";
import type { KeySecret } from "../../api/types";
const schema = z.object({
  name: z.string().trim().min(1, "请输入名称").max(120),
  scopes: z
    .array(z.enum(["upload", "read", "delete"]))
    .min(1, "至少选择一项权限"),
  expiry: z.enum(["never", "30", "90", "365", "custom"]),
  custom: z.string(),
});
export function KeyForm({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: KeySecret) => void;
}) {
  const { client } = useAuth();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      scopes: ["upload", "read"],
      expiry: "never",
      custom: "",
    },
  });
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      let expires_at: string | null = null;
      if (values.expiry === "custom") {
        const date = new Date(values.custom);
        if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
          throw new Error("请选择未来的到期时间");
        expires_at = date.toISOString();
      } else if (values.expiry !== "never")
        expires_at = new Date(
          Date.now() + Number(values.expiry) * 86400000,
        ).toISOString();
      return client.json<KeySecret>("/keys", "POST", {
        name: values.name,
        scopes: values.scopes,
        expires_at,
      });
    },
    onSuccess: (result) => {
      void cache.invalidateQueries({ queryKey: ["keys"] });
      form.reset();
      onOpenChange(false);
      onCreated(result);
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
      title="创建 API Key"
      description="为每个调用方建立独立身份，密钥仅展示一次。"
    >
      <form
        onSubmit={form.handleSubmit((values) => {
          setError("");
          mutation.mutate(values);
        })}
      >
        <label className="field-label" htmlFor="key-name">
          名称
        </label>
        <input
          id="key-name"
          placeholder="例如：博客附件"
          {...form.register("name")}
        />
        <fieldset className="scope-options">
          <legend>权限</legend>
          {[
            ["upload", "上传文件"],
            ["read", "读取自己的文件"],
            ["delete", "删除自己的文件"],
          ].map(([value, label]) => (
            <label className="checkbox-label" key={value}>
              <input
                type="checkbox"
                value={value}
                {...form.register("scopes")}
              />
              {label}
              <code>{value}</code>
            </label>
          ))}
        </fieldset>
        <label className="field-label" htmlFor="key-expiry">
          有效期
        </label>
        <Select
          id="key-expiry"
          label="有效期"
          value={form.watch("expiry")}
          onValueChange={(value) =>
            form.setValue("expiry", value as z.infer<typeof schema>["expiry"])
          }
          items={[
            { value: "never", label: "永不过期" },
            { value: "30", label: "30 天" },
            { value: "90", label: "90 天" },
            { value: "365", label: "365 天" },
            { value: "custom", label: "自定义时间" },
          ]}
        />
        {form.watch("expiry") === "custom" && (
          <>
            <label className="field-label" htmlFor="custom-expiry">
              到期时间（本地时区）
            </label>
            <input
              id="custom-expiry"
              type="datetime-local"
              {...form.register("custom")}
            />
          </>
        )}
        {(error || Object.values(form.formState.errors)[0]) && (
          <p className="form-error" role="alert">
            {error || Object.values(form.formState.errors)[0]?.message}
          </p>
        )}
        <div className="dialog-actions">
          <Button
            variant="secondary"
            type="button"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <span className="spinner" aria-hidden="true" />
            )}
            {mutation.isPending ? "创建中…" : "创建密钥"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
