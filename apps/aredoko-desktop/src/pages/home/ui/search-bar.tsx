import type { ReactNode } from "react";

import { PackageScope } from "#/features/choose-scope";
import { KindChips } from "#/features/filter-kind";

import { SearchRow } from "./search-row.tsx";

const SearchBar = (): ReactNode => (
  <div className="flex flex-col gap-2">
    <SearchRow />
    <div className="flex flex-wrap items-center gap-2">
      <PackageScope />
      <KindChips />
    </div>
  </div>
);

export { SearchBar };
