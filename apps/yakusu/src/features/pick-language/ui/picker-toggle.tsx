import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { usePicker, useSetPicker } from "#/entities/language";
import type { Side } from "#/entities/language";

import { Chevron } from "./chevron.tsx";

const LABELS: Readonly<Record<Side, string>> = {
  source: "翻訳元の言語を選ぶ",
  target: "翻訳先の言語を選ぶ",
};

const PickerToggle = ({ side }: Readonly<{ side: Side }>): ReactNode => {
  const picker = usePicker();
  const setPicker = useSetPicker();
  const open = picker.kind === "open" && picker.side === side;
  const onClick = useCallback(() => {
    if (open) {
      setPicker({ kind: "closed" });
      return;
    }
    setPicker({ kind: "open", side });
  }, [open, setPicker, side]);
  return (
    <Button
      aria-expanded={open}
      aria-label={LABELS[side]}
      className="rounded-full"
      size="icon"
      variant="ghost"
      onClick={onClick}
    >
      <Chevron open={open} />
    </Button>
  );
};

export { PickerToggle };
