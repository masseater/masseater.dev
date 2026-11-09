import { useHydrated } from "@tanstack/react-router";
import { Effect, Option, pipe } from "effect";
import { useCallback } from "react";

import type { TagSearch } from "./search";

type Navigate = (options: Readonly<{ search: TagSearch; resetScroll: false }>) => Promise<void>;

const useTagFilter = ({
  search,
  navigate,
}: Readonly<{ search: TagSearch; navigate: Navigate }>): Readonly<{
  activeTag: Option.Option<string>;
  select: (search: TagSearch) => void;
}> => {
  const hydrated = useHydrated();
  const activeTag = pipe(
    Option.fromUndefinedOr(search.tag),
    Option.filter(() => hydrated),
  );
  const select = useCallback(
    (next: TagSearch) => {
      Effect.runFork(Effect.promise(() => navigate({ search: next, resetScroll: false })));
    },
    [navigate],
  );
  return { activeTag, select };
};

export type { Navigate };
export { useTagFilter };
