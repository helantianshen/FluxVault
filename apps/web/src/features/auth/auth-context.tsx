import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiClient, API_URL } from "../../api/client";
import { Context } from "./auth";

const sessionKey = `fluxvault.session:${API_URL}`;
interface Session {
  token: string;
  expiresAt: number;
}

/** 仅恢复当前标签页内未过期的会话，真实权限仍由服务端验证 */
function restoreSession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(sessionKey) ?? "null");
    if (
      typeof value?.token === "string" &&
      value.token &&
      typeof value.expiresAt === "number" &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > Date.now()
    )
      return value;
    sessionStorage.removeItem(sessionKey);
  } catch {
    /* 浏览器禁止存储时仍允许内存会话 */
  }
  return null;
}

/** 在标签页会话中保留登录，退出、过期或 401 时清理凭据和查询 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(restoreSession);
  const cache = useQueryClient();
  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* 禁用存储时只清理内存 */
    }
    setSession(null);
    cache.clear();
  }, [cache]);
  const login = useCallback((token: string, expiresAt: string) => {
    const expiry = Date.parse(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now())
      throw new Error("登录会话已过期，请重新登录");
    const value = { token, expiresAt: expiry };
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(value));
    } catch {
      /* 禁用存储时保留内存登录 */
    }
    setSession(value);
  }, []);
  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(
      logout,
      Math.min(Math.max(0, session.expiresAt - Date.now()), 2147483647),
    );
    return () => clearTimeout(timeout);
  }, [session, logout]);
  const token = session?.token ?? null;
  const client = useMemo(() => new ApiClient(token, logout), [token, logout]);
  return <Context value={{ token, client, login, logout }}>{children}</Context>;
}
