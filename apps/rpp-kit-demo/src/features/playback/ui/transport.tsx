import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";

import { clockOf, song } from "#/entities/song";
import { usePlayback } from "#/features/playback/model/playback";
import { transport } from "#/shared/config";

import { PlayButton } from "./play-button";

export const Transport = (): ReactNode => {
  const { position } = usePlayback();
  const section = Option.match(
    Arr.findFirst(song.sections, ({ start, end }) => start <= position && position < end),
    { onNone: () => "", onSome: ({ name }) => name },
  );
  const bpm = `${String(song.tempo.bpm)} ${transport.bpm}`;
  const meter = `${String(song.tempo.numerator)}/${String(song.tempo.denominator)}`;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <PlayButton />
      <span className="text-sm tabular-nums">{`${clockOf(position)} / ${clockOf(song.length)}`}</span>
      <span className="text-muted-foreground text-sm">{section}</span>
      <span className="text-muted-foreground ml-auto flex gap-3 text-xs">
        <span>{bpm}</span>
        <span>{meter}</span>
      </span>
    </div>
  );
};
