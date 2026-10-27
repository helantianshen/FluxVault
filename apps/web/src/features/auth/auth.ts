import { createContext, useContext } from "react";
import type { ApiClient } from "../../api/client";
interface Auth {
  token: string | null;
  client: ApiClient;
  login: (token: string, expiresAt: string) => void;
  logout: () => void;
}
export const Context = createContext<Auth | null>(null);
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("缺少认证上下文");
  return value;
}
