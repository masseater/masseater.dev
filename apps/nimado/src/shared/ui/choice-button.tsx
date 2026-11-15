import { cn } from "@masseater.dev/ui/cn";
import { useCallback } from "react";
import type { ReactNode } from "react";

const ACTIVE = "bg-foreground text-background border-foreground";
const IDLE = "hover:bg-muted text-muted-foreground";

const ChoiceButton = <Value extends string>({
  value,
  text,
  selected,
  onChoose,
}: Readonly<{
  value: Value;
  text: string;
  selected: boolean;
  onChoose: (value: Value) => void;
}>): ReactNode => {
  const choose = useCallback(() => {
    onChoose(value);
  }, [onChoose, value]);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={choose}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        selected && ACTIVE,
        !selected && IDLE,
      )}
    >
      {text}
    </button>
  );
};

export { ChoiceButton };
