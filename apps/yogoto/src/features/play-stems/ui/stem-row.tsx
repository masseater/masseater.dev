import type { ReactNode } from "react";

import type { Deck } from "#/features/play-stems/model/playback.ts";
import type { Track } from "#/features/play-stems/model/tracks.ts";

import { SwitchButton } from "./switch-button.tsx";
import { Waveform } from "./waveform.tsx";

export const StemRow = ({ track, deck }: Readonly<{ track: Track; deck: Deck }>): ReactNode => (
  <div className="flex items-center gap-3">
    <span className="w-24 truncate text-sm capitalize">{track.stem}</span>
    <Waveform track={track} deck={deck} />
    <SwitchButton stem={track.stem} which="soloed" />
    <SwitchButton stem={track.stem} which="muted" />
  </div>
);
