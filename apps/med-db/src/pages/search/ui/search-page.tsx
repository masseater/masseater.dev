import type { ReactNode } from "react";

import { PageSections } from "#/shared/ui/page-sections.tsx";

import { FoundPeople } from "./found-people.tsx";
import { FoundSongs } from "./found-songs.tsx";
import { FoundVideos } from "./found-videos.tsx";
import { SearchHeader } from "./search-header.tsx";

export const SearchPage = (): ReactNode => (
  <PageSections>
    <SearchHeader />
    <FoundSongs />
    <FoundVideos />
    <FoundPeople />
  </PageSections>
);
