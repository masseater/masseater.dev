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

const useDraft = (): string => useAtomValue(draftAtom);

const useSetDraft = (): ((draft: string) => void) => useAtomSet(draftAtom);

const useQueryText = (): string => useAtomValue(queryAtom);

const useSubmitQuery = (): ((query: string) => void) => {
  const setQuery = useAtomSet(queryAtom);
  const setSelected = useAtomSet(selectedResultAtom);
  const setOthersShown = useAtomSet(othersShownAtom);
  return (query) => {
    setSelected(Option.none());
    setOthersShown(false);
    setQuery(query);
  };
};

const useClearSearch = (): (() => void) => {
  const setDraft = useAtomSet(draftAtom);
  const submit = useSubmitQuery();
  return () => {
    setDraft("");
    submit("");
  };
};

const useSelectedResult = (): Option.Option<Result> => useAtomValue(selectedResultAtom);

const useSelectResult = (): ((result: Option.Option<Result>) => void) =>
  useAtomSet(selectedResultAtom);

const useOthersShown = (): boolean => useAtomValue(othersShownAtom);

const useShowOthers = (): (() => void) => {
  const setOthersShown = useAtomSet(othersShownAtom);
  return () => {
    setOthersShown(true);
  };
};

const useKinds = (): readonly Kind[] => useAtomValue(kindsAtom);

const useToggleKind = (): ((kind: Kind) => void) => {
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

export {
  useClearSearch,
  useDraft,
  useKinds,
  useOthersShown,
  useQueryText,
  useSelectResult,
  useSelectedResult,
  useSetDraft,
  useShowOthers,
  useSubmitQuery,
  useToggleKind,
};
