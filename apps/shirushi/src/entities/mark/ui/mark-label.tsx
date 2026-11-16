import type { Mark } from "@masseater.dev/shirushi-protocol";
import { cn } from "@masseater.dev/ui/cn";
import { Array as Arr, String as Str, pipe } from "effect";
import type { ReactNode } from "react";

import { ASPECT_LABELS, VERB_LABELS } from "#/shared/config";
import { clock } from "#/shared/lib/source";

const summaryOf = (mark: Mark): string => {
  if (Str.isNonEmpty(mark.words)) {
    return mark.words;
  }
  return pipe(
    mark.aspects,
    Arr.map((aspect) => ASPECT_LABELS[aspect]),
    Arr.join("・"),
  );
};

export const MarkLabel = ({
  mark,
  showSong,
}: Readonly<{ mark: Mark; showSong: boolean }>): ReactNode => (
  <>
    <span className="flex items-baseline gap-2">
      <span
        className={cn(
          "w-8 shrink-0 text-xs font-medium",
          mark.verb === "dislike" && "text-destructive",
        )}
      >
        {VERB_LABELS[mark.verb]}
      </span>
      <span className="min-w-0 flex-1 truncate">{summaryOf(mark)}</span>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {`${clock(mark.from)}–${clock(mark.to)}`}
      </span>
    </span>
    {showSong && (
      <span className="text-muted-foreground block truncate pl-10 text-xs">{mark.song.title}</span>
    )}
  </>
);
