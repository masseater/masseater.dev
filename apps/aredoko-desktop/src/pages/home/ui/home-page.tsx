import type { ReactNode } from "react";

import { DropZone } from "#/features/library";

import { HomeBody } from "./home-body.tsx";
import { SearchBar } from "./search-bar.tsx";

export const HomePage = (): ReactNode => (
  <section className="flex min-h-0 flex-1 flex-col gap-4">
    <SearchBar />
    <DropZone>
      <HomeBody />
    </DropZone>
  </section>
);
