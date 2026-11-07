import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { useClearSearch } from "./search-state.ts";

const selectedAtom = Atom.make<Option.Option<number>>(Option.none());

const useSelectedPackage = (): Option.Option<number> => useAtomValue(selectedAtom);

const useSelectPackage = (): ((id: Option.Option<number>) => void) => useAtomSet(selectedAtom);

const useShowPackage = (): ((id: number) => void) => {
  const select = useAtomSet(selectedAtom);
  const clearSearch = useClearSearch();
  return (id) => {
    clearSearch();
    select(Option.some(id));
  };
};

export { useSelectPackage, useSelectedPackage, useShowPackage };
