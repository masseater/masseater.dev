import type { ReactNode } from "react";

import { PickFilesButton } from "#/features/library";

import { SearchForm } from "./search-form.tsx";

const SearchRow = (): ReactNode => (
  <div className="flex gap-2">
    <div className="min-w-0 flex-1">
      <SearchForm />
    </div>
    <PickFilesButton variant="outline" />
  </div>
);

export { SearchRow };
