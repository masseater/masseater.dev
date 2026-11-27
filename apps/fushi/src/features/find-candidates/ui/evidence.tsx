import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import type { Candidate } from "#/features/find-candidates/model/candidates.ts";

import { EvidenceClip } from "./evidence-clip.tsx";

const SHOWN = 12;

export const Evidence = ({
  candidate,
  songs,
}: Readonly<{ candidate: Candidate; songs: readonly Song[] }>): ReactNode => (
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
    {pipe(
      Arr.take(candidate.evidence, SHOWN),
      Arr.flatMap((place) =>
        pipe(
          Arr.findFirst(songs, (song) => song.name === place.song),
          Option.map((song) => (
            <EvidenceClip
              key={`${song.id}:${place.bar}:${place.line}:${place.column}`}
              song={song}
              place={place}
            />
          )),
          Option.toArray,
        ),
      ),
    )}
  </div>
);
