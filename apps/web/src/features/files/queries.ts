import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/auth";
import type { FilePage } from "../../api/types";
// 按筛选参数区分缓存，避免不同文件列表共享结果
export function useFiles(params: URLSearchParams) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ["files", params.toString()],
    queryFn: ({ signal }) =>
      client.request<FilePage>(`/files?${params}`, { signal }),
    // 切换筛选时保留上一份数据平滑过渡，避免整表退回骨架屏造成闪动
    placeholderData: keepPreviousData,
  });
}
