import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 ** 2).toFixed(1)} MiB`;
}
export const formatTime = (value: string) =>
  format(new Date(value), "MM-dd HH:mm");
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "操作失败，请重试";
