import { clock } from "@masseater.dev/media-notes-ui";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useControls, usePlayback } from "#/features/play-stems/model/playback.ts";
import type { Deck } from "#/features/play-stems/model/playback.ts";
import { LABELS } from "#/shared/config/index.ts";

const STEP = 0.01;

const START = 0;

export const SeekSlider = ({ stem, deck }: Readonly<{ stem: string; deck: Deck }>): ReactNode => {
  const { position } = usePlayback();
  const { seek } = useControls(deck);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      seek(Number(event.currentTarget.value));
    },
    [seek],
  );
  return (
    <input
      type="range"
      min={START}
      max={deck.duration}
      step={STEP}
      value={position}
      onChange={handleChange}
      aria-label={`${stem} ${LABELS.seek}`}
      aria-valuetext={`${clock(position)}${LABELS.separator}${clock(deck.duration)}`}
      className="absolute inset-0 cursor-pointer opacity-0"
    />
  );
};
