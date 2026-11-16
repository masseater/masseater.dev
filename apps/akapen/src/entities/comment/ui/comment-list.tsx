import type { Comment } from "@masseater.dev/akapen-protocol";
import { Array as Arr, Order, pipe } from "effect";
import type { ReactNode } from "react";

import { CommentRow } from "./comment-row.tsx";

const byStart = Order.mapInput(Order.Number, ({ from }: Comment) => from);

export const CommentList = ({
  comments,
  onPick,
  onRemove,
}: Readonly<{
  comments: readonly Comment[];
  onPick: (comment: Comment) => void;
  onRemove: (comment: Comment) => void;
}>): ReactNode => (
  <ul className="grid">
    {pipe(
      comments,
      Arr.sortBy(byStart),
      Arr.map((comment) => (
        <CommentRow key={comment.id} comment={comment} onPick={onPick} onRemove={onRemove} />
      )),
    )}
  </ul>
);
