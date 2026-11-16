import type { Comment } from "@masseater.dev/akapen-protocol";
import { clock } from "@masseater.dev/media-notes-ui";
import { cn } from "@masseater.dev/ui/cn";
import { Option } from "effect";
import type { ReactNode } from "react";

import { ResolvedWords } from "./resolved-words.tsx";

const DONE = "済";

export const CommentLabel = ({ comment }: Readonly<{ comment: Comment }>): ReactNode => {
  const resolution = Option.fromNullishOr(comment.resolution);
  const done = Option.isSome(resolution);
  return (
    <>
      <span className="flex items-baseline gap-2">
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {`${clock(comment.from)}–${clock(comment.to)}`}
        </span>
        <span
          className={cn("min-w-0 flex-1 break-words", done && "text-muted-foreground line-through")}
        >
          {comment.words}
        </span>
        {done && <span className="text-muted-foreground shrink-0 text-xs">{DONE}</span>}
      </span>
      <ResolvedWords resolution={resolution} />
    </>
  );
};
