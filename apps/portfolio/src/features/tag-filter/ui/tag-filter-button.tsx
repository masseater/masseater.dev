import { useCallback } from "react";
import type { ReactNode } from "react";

import type { TagSearch } from "#/features/tag-filter/model/search";

const TagFilterButton = ({
  active,
  children,
  onSelect,
  search,
}: Readonly<{
  active: boolean;
  children: string;
  onSelect: (search: TagSearch) => void;
  search: TagSearch;
}>): ReactNode => {
  const select = useCallback(() => {
    onSelect(search);
  }, [onSelect, search]);
  return (
    <li className="max-w-full shrink-0">
      <button
        aria-pressed={active}
        className="ring-foreground/10 hover:text-foreground/80 aria-pressed:ring-foreground/60 aria-pressed:text-foreground max-w-full cursor-pointer truncate rounded-full px-2 py-0.5 tracking-widest uppercase ring-1 transition-colors"
        onClick={select}
        title={children}
        type="button"
      >
        {children}
      </button>
    </li>
  );
};

export { TagFilterButton };
