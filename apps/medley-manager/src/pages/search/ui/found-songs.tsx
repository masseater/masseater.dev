import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useSearchResults } from "#/pages/search/api/use-search-results.ts";
import { SectionHeading } from "#/shared/ui/section-heading.tsx";

import { SongPill } from "./song-pill.tsx";

export const FoundSongs = (): ReactNode => {
  const { songs } = useSearchResults();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="曲" count={songs.length} />
      <ul className="flex flex-wrap gap-2">
        {pipe(
          songs,
          Array.map((song) => <SongPill key={song.id} song={song} />),
        )}
      </ul>
    </section>
  );
};
