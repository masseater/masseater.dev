import { Button } from "@masseater.dev/ui/button";
import { X } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Mark } from "#/shared/api/index.ts";

const REMOVE = "消す";

export const MarkRow = ({
  mark,
  children,
  onPick,
  onRemove,
}: Readonly<{
  mark: Mark;
  children: ReactNode;
  onPick: (mark: Mark) => void;
  onRemove: (id: string) => void;
}>): ReactNode => {
  const pick = useCallback(() => {
    onPick(mark);
  }, [onPick, mark]);
  const remove = useCallback(() => {
    onRemove(mark.id);
  }, [onRemove, mark.id]);
  return (
    <li className="group flex items-start gap-1">
      <button
        type="button"
        className="hover:bg-accent min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm"
        onClick={pick}
      >
        {children}
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="mt-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={REMOVE}
        title={REMOVE}
        onClick={remove}
      >
        <X />
      </Button>
    </li>
  );
};
