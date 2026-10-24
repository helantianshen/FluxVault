import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers2, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "./auth";
import { Button } from "../../components/ui/button";
import type { LoginResult } from "../../api/types";
import { errorMessage } from "../../lib/utils";
const schema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});
export function LoginPage() {
  const { client, login } = useAuth();
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "admin", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const result = await client.json<LoginResult>(
        "/auth/login",
        "POST",
        values,
      );
      login(result.access_token);
    } catch (error) {
      setError(errorMessage(error));
      setShake((count) => count + 1);
    }
  });
  return (
    <div className="login-shell">
      <motion.div
        className="login-brand brand"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <Layers2 />
        FluxVault
      </motion.div>
      <motion.main
        className="login-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="login-symbol">
          <ShieldCheck />
        </div>
        <h1>登录管理台</h1>
        <p>管理文件、存储实例和调用方权限。</p>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="username">
            用户名
          </label>
          <input
            id="username"
            autoComplete="username"
            {...form.register("username")}
          />
          <label className="field-label" htmlFor="password">
            密码
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          {(error ||
            form.formState.errors.password ||
            form.formState.errors.username) && (
            <motion.p
              key={shake}
              className="form-error"
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, -7, 7, -4, 4, 0] }}
              transition={{ duration: 0.32, ease: "easeInOut" }}
            >
              {error ||
                form.formState.errors.password?.message ||
                form.formState.errors.username?.message}
            </motion.p>
          )}
          <Button
            className="login-submit"
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting && (
              <span className="spinner" aria-hidden="true" />
            )}
            {form.formState.isSubmitting ? "正在登录…" : "进入工作空间"}
            {!form.formState.isSubmitting && <ArrowRight />}
          </Button>
        </form>
        <p className="login-note">
          登录有效期 12 小时。刷新页面后需要重新登录。
        </p>
      </motion.main>
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, delay: 0.14 }}
      >
        FluxVault · 本地 Mock 版本
      </motion.footer>
    </div>
  );
}
