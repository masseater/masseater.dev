import { useCallback } from "react";
import type { ReactNode } from "react";

import type { CollectionSearch } from "#/pages/collection/model/search";

const TagFilterButton = ({
  active,
  children,
  onSelect,
  search,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  onSelect: (search: CollectionSearch) => void;
  search: CollectionSearch;
}>): ReactNode => {
  const select = useCallback(() => {
    onSelect(search);
  }, [onSelect, search]);
  return (
    <li className="shrink-0">
      <button
        aria-pressed={active}
        className="ring-foreground/10 hover:text-foreground/80 aria-pressed:ring-foreground/60 aria-pressed:text-foreground cursor-pointer rounded-full px-2 py-0.5 tracking-widest whitespace-nowrap uppercase ring-1 transition-colors"
        onClick={select}
        type="button"
      >
        {children}
      </button>
    </li>
  );
};

export { TagFilterButton };
