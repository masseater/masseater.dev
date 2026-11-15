import type { MouseEventHandler, ReactNode } from "react";
import { useCallback } from "react";

import { focus, useSetSearch, useViewerStore } from "#/entities/mosaic";
import type { Hit } from "#/features/search-tiles/lib/search";

export const SearchResult = ({ hit }: Readonly<{ hit: Hit }>): ReactNode => {
  const store = useViewerStore();
  const setQuery = useSetSearch();
  const choose = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      setQuery("");
      store.step(focus({ tile: hit.tile, now: event.timeStamp }));
    },
    [hit.tile, setQuery, store],
  );
  return (
    <li>
      <button
        type="button"
        className="hover:bg-accent flex w-full flex-col px-3 py-2 text-left"
        onClick={choose}
      >
        <span>{hit.name}</span>
        <span className="text-muted-foreground text-xs">{hit.artist}</span>
      </button>
    </li>
  );
};
