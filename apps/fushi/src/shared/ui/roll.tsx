import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Snippet } from "#/shared/lib/index.ts";

import { HEIGHT, WIDTH, frameOf } from "./frame.ts";
import { NoteBar } from "./note-bar.tsx";
import { Playhead } from "./playhead.tsx";

export const Roll = ({
  snippet,
  fraction,
}: Readonly<{ snippet: Snippet; fraction: Option.Option<number> }>): ReactNode => {
  const frame = frameOf(snippet.notes);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="bg-muted/50 h-12 w-full rounded-sm border"
      aria-hidden
    >
      {pipe(
        snippet.notes,
        Arr.map((note) => <NoteBar key={`${note.start}-${note.midi}`} note={note} frame={frame} />),
      )}
      {Option.isSome(fraction) && <Playhead fraction={fraction.value} />}
    </svg>
  );
};
