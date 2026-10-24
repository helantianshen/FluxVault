import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiClient } from "../../api/client";
import { Context } from "./auth";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const cache = useQueryClient();
  const logout = useCallback(() => {
    setToken(null);
    cache.clear();
  }, [cache]);
  const client = useMemo(() => new ApiClient(token, logout), [token, logout]);
  return (
    <Context value={{ token, client, login: setToken, logout }}>
      {children}
    </Context>
  );
}
