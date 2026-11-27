import { useAtomSet } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { Undo2 } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { undoAtom } from "#/features/judge-habit/model/decide.ts";
import { LABELS } from "#/shared/config/index.ts";

export const UndoButton = ({
  current: style,
  habit,
}: Readonly<{ current: string; habit: string }>): ReactNode => {
  const undo = useAtomSet(undoAtom);
  const click = useCallback(() => {
    undo({ style, habit });
  }, [undo, style, habit]);
  return (
    <Button variant="outline" size="sm" onClick={click}>
      <Undo2 aria-hidden />
      {LABELS.undo}
    </Button>
  );
};
