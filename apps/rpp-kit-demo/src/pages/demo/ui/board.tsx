import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { song } from "#/entities/song/index.ts";

import { Lane } from "./lane.tsx";
import { SectionStrip } from "./section-strip.tsx";

export const Board = (): ReactNode => (
  <div className="bg-card border-border overflow-hidden rounded-lg border">
    <div className="flex">
      <div className="w-20 shrink-0 sm:w-28" />
      <SectionStrip />
    </div>
    {pipe(
      song.tracks,
      Arr.map((track) => <Lane index={track.index} key={track.guid} track={track} />),
    )}
  </div>
);
