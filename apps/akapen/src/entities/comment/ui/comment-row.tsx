import type { Comment } from "@masseater.dev/akapen-protocol";
import { Button } from "@masseater.dev/ui/button";
import { X } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { CommentLabel } from "./comment-label.tsx";

const REMOVE = "消す";

export const CommentRow = ({
  comment,
  onPick,
  onRemove,
}: Readonly<{
  comment: Comment;
  onPick: (comment: Comment) => void;
  onRemove: (comment: Comment) => void;
}>): ReactNode => {
  const pick = useCallback(() => {
    onPick(comment);
  }, [onPick, comment]);
  const remove = useCallback(() => {
    onRemove(comment);
  }, [onRemove, comment]);
  return (
    <li className="group flex items-start gap-1">
      <button
        type="button"
        className="hover:bg-accent min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm"
        onClick={pick}
      >
        <CommentLabel comment={comment} />
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
