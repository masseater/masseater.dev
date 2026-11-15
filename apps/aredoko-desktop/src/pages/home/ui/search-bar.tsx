import type { ReactNode } from "react";

import { PackageScope } from "#/features/choose-scope/index.ts";
import { KindChips } from "#/features/filter-kind/index.ts";

import { SearchRow } from "./search-row.tsx";

export const SearchBar = (): ReactNode => (
  <div className="flex flex-col gap-2">
    <SearchRow />
    <div className="flex flex-wrap items-center gap-2">
      <PackageScope />
      <KindChips />
    </div>
  </div>
);
