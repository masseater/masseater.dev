import { Array as Arr, Option, pipe } from "effect";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import { useStop } from "#/features/play-stems/model/playback.ts";
import type { Deck } from "#/features/play-stems/model/playback.ts";
import type { Track } from "#/features/play-stems/model/tracks.ts";

import { StemRow } from "./stem-row.tsx";
import { Transport } from "./transport.tsx";

const NO_LENGTH = 0;

const durationOf = (tracks: readonly Track[]): number =>
  Option.match(Arr.head(tracks), {
    onNone: () => NO_LENGTH,
    onSome: ({ buffer }) => buffer.duration,
  });

export const StemMixer = ({ tracks }: Readonly<{ tracks: readonly Track[] }>): ReactNode => {
  const stop = useStop();
  useEffect(
    () => (): void => {
      stop(true);
    },
    [stop],
  );
  const deck: Deck = useMemo(() => ({ tracks, duration: durationOf(tracks) }), [tracks]);
  return (
    <section className="grid gap-2">
      {pipe(
        tracks,
        Arr.map((track) => <StemRow key={track.stem} track={track} deck={deck} />),
      )}
      <Transport deck={deck} />
    </section>
  );
};
