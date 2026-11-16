import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { Array as Arr, Option, pipe } from "effect";
import { Undo2 } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { removedAtom, undoAtom } from "#/entities/comment/model/remove";
import { useUndoKey } from "#/entities/comment/model/use-undo-key";

import { CommentLabel } from "./comment-label.tsx";

const REMOVED = "消しました";
const UNDO = "元に戻す";

export const RemovedNotice = (): ReactNode => {
  const last = pipe(useAtomValue(removedAtom), Arr.last);
  const undo = useAtomSet(undoAtom);
  const restore = useCallback(() => {
    undo();
  }, [undo]);
  useUndoKey(restore);
  return Option.match(last, {
    onNone: () => Option.getOrNull(Option.none()),
    onSome: (comment) => (
      <output className="bg-muted flex items-start gap-2 rounded-md px-2 py-1.5 text-sm">
        <span className="text-muted-foreground shrink-0">{REMOVED}</span>
        <span className="min-w-0 flex-1">
          <CommentLabel comment={comment} />
        </span>
        <Button variant="ghost" size="xs" onClick={restore}>
          <Undo2 />
          {UNDO}
        </Button>
      </output>
    ),
  });
};
