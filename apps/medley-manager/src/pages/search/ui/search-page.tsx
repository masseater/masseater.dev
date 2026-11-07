import type { ReactNode } from "react";

import { FoundPeople } from "./found-people";
import { FoundSongs } from "./found-songs";
import { FoundVideos } from "./found-videos";
import { SearchHeader } from "./search-header";

const SearchPage = (): ReactNode => (
  <div className="flex flex-col gap-10">
    <SearchHeader />
    <FoundSongs />
    <FoundVideos />
    <FoundPeople />
  </div>
);

export { SearchPage };
