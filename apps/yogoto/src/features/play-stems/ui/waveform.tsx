import type { ReactNode } from "react";

import type { Deck } from "#/features/play-stems/model/playback.ts";
import type { Track } from "#/features/play-stems/model/tracks.ts";

import { Peaks } from "./peaks.tsx";
import { Playhead } from "./playhead.tsx";
import { SeekSlider } from "./seek-slider.tsx";

const HEIGHT = 100;

export const Waveform = ({ track, deck }: Readonly<{ track: Track; deck: Deck }>): ReactNode => (
  <div className="bg-muted relative h-12 flex-1 overflow-hidden rounded-sm">
    <svg
      viewBox={`0 0 ${String(track.peaks.length)} ${String(HEIGHT)}`}
      preserveAspectRatio="none"
      className="stroke-foreground/60 size-full"
      aria-hidden
    >
      <Peaks peaks={track.peaks} />
      <Playhead duration={deck.duration} />
    </svg>
    <SeekSlider stem={track.stem} deck={deck} />
  </div>
);
