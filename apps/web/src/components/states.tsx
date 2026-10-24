import type { ReactNode } from "react";
import { AlertCircle, SearchX } from "lucide-react";
import { Button } from "./ui/button";
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <AlertCircle />
      <h2>暂时无法加载</h2>
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          重新加载
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <SearchX />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-skeleton" role="status" aria-label="正在加载">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}
