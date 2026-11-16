import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array, String, pipe } from "effect";
import { Atom } from "effect/reactivity";

import type { Language } from "#/entities/language/index.ts";
import { useSetPicker } from "#/entities/language/index.ts";

const queryAtom = Atom.make("");

const normalized = (query: string): string => pipe(query, String.trim, String.toLowerCase);

export const matching = ({
  languages,
  query,
}: Readonly<{ languages: readonly Language[]; query: string }>): readonly Language[] => {
  const needle = normalized(query);
  if (String.isEmpty(needle)) {
    return languages;
  }
  return pipe(
    languages,
    Array.filter(
      ({ code, name }) =>
        pipe(name, String.includes(needle)) || pipe(code, String.startsWith(needle)),
    ),
  );
};

export const useQueryText = (): string => useAtomValue(queryAtom);

export const useIsSearching = (): boolean => String.isNonEmpty(normalized(useQueryText()));

export const useSetQueryText = (): ((query: string) => void) => useAtomSet(queryAtom);

export const useClosePicker = (): (() => void) => {
  const setQuery = useSetQueryText();
  const setPicker = useSetPicker();
  return () => {
    setQuery("");
    setPicker({ kind: "closed" });
  };
};
