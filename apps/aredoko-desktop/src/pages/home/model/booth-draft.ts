import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

type Draft = Readonly<{ packageId: number; url: string }>;

const NO_PACKAGE = 0;

const draftAtom = Atom.make<Draft>({ packageId: NO_PACKAGE, url: "" });

const useBoothDraft = (packageId: number): string => {
  const draft = useAtomValue(draftAtom);
  if (draft.packageId === packageId) {
    return draft.url;
  }
  return "";
};

const useSetBoothDraft = (): ((draft: Draft) => void) => useAtomSet(draftAtom);

export { useBoothDraft, useSetBoothDraft };
