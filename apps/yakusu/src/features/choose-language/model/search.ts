import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array, String, pipe } from "effect";
import { Atom } from "effect/reactivity";

import { useSetPicker } from "#/entities/language";
import type { Language } from "#/entities/language";

const queryAtom = Atom.make("");

const normalized = (query: string): string => pipe(query, String.trim, String.toLowerCase);

const matching = ({
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

const useQueryText = (): string => useAtomValue(queryAtom);

const useIsSearching = (): boolean => String.isNonEmpty(normalized(useQueryText()));

const useSetQueryText = (): ((query: string) => void) => useAtomSet(queryAtom);

const useClosePicker = (): (() => void) => {
  const setQuery = useSetQueryText();
  const setPicker = useSetPicker();
  return () => {
    setQuery("");
    setPicker({ kind: "closed" });
  };
};

export { matching, useClosePicker, useIsSearching, useQueryText, useSetQueryText };
