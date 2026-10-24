import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

// Radix Select 不接受空字符串选项值，这里在组件边界把 "" 映射为内部哨兵值。
const EMPTY = "__fluxvault-empty__";
export interface SelectItem {
  value: string;
  label: string;
}
export function Select({
  value,
  onValueChange,
  items,
  id,
  label,
  disabled = false,
  className = "",
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  id?: string;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const internal = value === "" ? EMPTY : value;
  return (
    <Primitive.Root
      value={internal}
      onValueChange={(next) => onValueChange(next === EMPTY ? "" : next)}
      disabled={disabled}
    >
      <Primitive.Trigger
        id={id}
        className={`select-trigger ${className}`}
        aria-label={label}
      >
        <Primitive.Value />
        <Primitive.Icon className="select-chevron">
          <ChevronDown />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          className="select-content"
          position="popper"
          sideOffset={5}
        >
          <Primitive.Viewport className="select-viewport">
            {items.map((item) => (
              <Primitive.Item
                key={item.value}
                value={item.value === "" ? EMPTY : item.value}
                className="select-item"
              >
                <Primitive.ItemText>{item.label}</Primitive.ItemText>
                <Primitive.ItemIndicator className="select-item-indicator">
                  <Check />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
