import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useSearchResults } from "#/pages/search/api/use-search-results";
import { SectionHeading } from "#/shared/ui/section-heading";

import { SongPill } from "./song-pill";

const FoundSongs = (): ReactNode => {
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

export { FoundSongs };
