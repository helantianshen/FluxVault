import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/auth";
import type { Instance } from "../../api/types";

// 共享实例查询缓存，供实例管理和文件操作使用
export function useInstances() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ["instances"],
    queryFn: ({ signal }) =>
      client.request<{ items: Instance[] }>("/instances", { signal }),
  });
}
