import { clock } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { useControls, usePlayback } from "#/features/play-stems/model/playback.ts";
import type { Deck } from "#/features/play-stems/model/playback.ts";
import { LABELS } from "#/shared/config/index.ts";

import { PlayGlyph } from "./play-glyph.tsx";

const nameOf = (playing: boolean): string => {
  if (playing) {
    return LABELS.stop;
  }
  return LABELS.play;
};

export const Transport = ({ deck }: Readonly<{ deck: Deck }>): ReactNode => {
  const playback = usePlayback();
  const { toggle } = useControls(deck);
  const playing = playback.status === "playing";
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={nameOf(playing)}
        className="flex size-9 items-center justify-center rounded-md border"
      >
        <PlayGlyph playing={playing} />
      </button>
      <span className="text-muted-foreground text-sm tabular-nums">
        {`${clock(playback.position)}${LABELS.separator}${clock(deck.duration)}`}
      </span>
    </div>
  );
};
