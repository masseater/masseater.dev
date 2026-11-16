import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useMarks } from "#/entities/mark/index.ts";
import { useSongLink } from "#/entities/song/index.ts";
import type { Verb } from "#/shared/api/index.ts";

import { MARK_LANE } from "./lanes.ts";
import { SpanRect } from "./span-rect.tsx";

const FILL: Readonly<Record<Verb, string>> = {
  like: "fill-foreground/70",
  dislike: "fill-destructive/70",
};

export const MarkLayer = ({ duration }: Readonly<{ duration: number }>): ReactNode =>
  pipe(
    useMarks(useSongLink()),
    Arr.map((mark) => (
      <SpanRect
        key={mark.id}
        from={mark.from}
        to={mark.to}
        duration={duration}
        lane={MARK_LANE}
        className={FILL[mark.verb]}
      />
    )),
  );
