import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { AssetKind, SearchResult } from "@masseater.dev/aredoko-protocol";
import { Array, Option, pipe } from "effect";
import { Atom } from "effect/reactivity";

type Kind = typeof AssetKind.Type;

type Result = typeof SearchResult.Type;

const draftAtom = Atom.make("");

const queryAtom = Atom.make("");

const kindsAtom = Atom.make<readonly Kind[]>([]);

const selectedResultAtom = Atom.make<Option.Option<Result>>(Option.none());

const othersShownAtom = Atom.make(false);

export const useDraft = (): string => useAtomValue(draftAtom);

export const useSetDraft = (): ((draft: string) => void) => useAtomSet(draftAtom);

export const useQueryText = (): string => useAtomValue(queryAtom);

export const useSubmitQuery = (): ((query: string) => void) => {
  const setQuery = useAtomSet(queryAtom);
  const setSelected = useAtomSet(selectedResultAtom);
  const setOthersShown = useAtomSet(othersShownAtom);
  return (query) => {
    setSelected(Option.none());
    setOthersShown(false);
    setQuery(query);
  };
};

export const useClearSearch = (): (() => void) => {
  const setDraft = useAtomSet(draftAtom);
  const submit = useSubmitQuery();
  return () => {
    setDraft("");
    submit("");
  };
};

export const useSelectedResult = (): Option.Option<Result> => useAtomValue(selectedResultAtom);

export const useSelectResult = (): ((result: Option.Option<Result>) => void) =>
  useAtomSet(selectedResultAtom);

export const useOthersShown = (): boolean => useAtomValue(othersShownAtom);

export const useShowOthers = (): (() => void) => {
  const setOthersShown = useAtomSet(othersShownAtom);
  return () => {
    setOthersShown(true);
  };
};

export const useKinds = (): readonly Kind[] => useAtomValue(kindsAtom);

export const useToggleKind = (): ((kind: Kind) => void) => {
  const kinds = useAtomValue(kindsAtom);
  const setKinds = useAtomSet(kindsAtom);
  return (kind) => {
    if (Array.contains(kinds, kind)) {
      setKinds(
        pipe(
          kinds,
          Array.filter((current) => current !== kind),
        ),
      );
      return;
    }
    setKinds(Array.append(kinds, kind));
  };
};
