import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/auth";
import type { SystemInfo } from "../../api/types";

// 读取后端运行能力，供系统信息和上传限制使用
export function useSystem() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ["system"],
    queryFn: ({ signal }) => client.request<SystemInfo>("/system", { signal }),
  });
}
