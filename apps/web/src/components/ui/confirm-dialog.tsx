import * as Alert from "@radix-ui/react-alert-dialog";
import { Button } from "./button";
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  busy = false,
  label = "确认删除",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <Alert.Root open={open} onOpenChange={onOpenChange}>
      <Alert.Portal>
        <Alert.Overlay className="dialog-overlay" />
        <Alert.Content className="dialog-content">
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description className="confirm-description">
            {description}
          </Alert.Description>
          <div className="dialog-actions">
            <Alert.Cancel asChild>
              <Button variant="secondary" disabled={busy}>
                取消
              </Button>
            </Alert.Cancel>
            <Button variant="danger" disabled={busy} onClick={onConfirm}>
              {busy ? "处理中…" : label}
            </Button>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}
