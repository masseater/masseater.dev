import type { ReactNode } from "react";

import { KindChips } from "./kind-chips.tsx";
import { PackageScope } from "./package-scope.tsx";
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
