import type { Place } from "@r_masseater/i68/habits";
import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { useSongView } from "#/entities/song/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { hrefOf, readyValue } from "#/shared/lib/index.ts";
import { Clip } from "#/shared/ui/index.ts";

export const EvidenceClip = ({
  song,
  place,
}: Readonly<{ song: Song; place: Place }>): ReactNode => {
  const view = Option.flatten(readyValue(useSongView(song.fumx)));
  const snippet = pipe(
    view,
    Option.map((each) => each.snippet(place.bar)),
  );
  return (
    Option.isSome(snippet) && (
      <Clip id={`${song.id}:${place.bar}:${place.line}:${place.column}`} snippet={snippet.value}>
        <a
          className="font-medium underline-offset-2 hover:underline"
          href={hrefOf({ page: "songs", style: song.style, song: Option.some(song.id) })}
        >
          {song.name}
        </a>
        <span className="text-muted-foreground tabular-nums">
          {place.bar}
          {LABELS.space}
          {LABELS.bars}
        </span>
      </Clip>
    )
  );
};
