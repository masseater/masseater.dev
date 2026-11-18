import type { ReactNode } from "react";

import { FoundPeople } from "./found-people.tsx";
import { FoundSongs } from "./found-songs.tsx";
import { FoundVideos } from "./found-videos.tsx";
import { SearchHeader } from "./search-header.tsx";

export const SearchPage = (): ReactNode => (
  <div className="flex flex-col gap-10">
    <SearchHeader />
    <FoundSongs />
    <FoundVideos />
    <FoundPeople />
  </div>
);
