import { useAtomValue } from "@effect/atom-react";
import { Array as Arr, Match, pipe } from "effect";
import type { ReactNode } from "react";

import { outcomeAtom } from "#/features/import-songs/model/import.ts";
import type { Outcome } from "#/features/import-songs/model/import.ts";
import { LABELS } from "#/shared/config/index.ts";

import { AddedSong } from "./added-song.tsx";
import { FailedFile } from "./failed-file.tsx";

const shown = Match.type<Outcome>().pipe(
  Match.discriminatorsExhaustive("status")({
    idle: (): ReactNode => [],
    reading: ({ files }): ReactNode => (
      <p className="text-muted-foreground text-sm">{`${files} ${LABELS.reading}`}</p>
    ),
    done: ({ added, failed }): ReactNode => (
      <ul className="grid gap-1.5">
        {pipe(
          added,
          Arr.map((song) => <AddedSong key={song.id} song={song} />),
        )}
        {pipe(
          failed,
          Arr.map((failure) => (
            <FailedFile key={failure.file} file={failure.file} message={failure.message} />
          )),
        )}
      </ul>
    ),
  }),
);

export const ImportResults = ({ current: style }: Readonly<{ current: string }>): ReactNode =>
  outcomeAtom(style).pipe(useAtomValue, shown);
