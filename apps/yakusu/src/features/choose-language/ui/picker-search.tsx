import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { BackButton } from "./back-button.tsx";
import { SearchInput } from "./search-input.tsx";

const PickerSearch = (): ReactNode => (
  <div className="flex items-center gap-2 border-b px-2 py-1">
    <BackButton />
    <Search className="text-muted-foreground size-5" />
    <SearchInput />
  </div>
);

export { PickerSearch };
