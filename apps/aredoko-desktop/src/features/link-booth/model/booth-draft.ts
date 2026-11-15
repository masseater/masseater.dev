import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

export type Draft = Readonly<{ packageId: number; url: string }>;

const NO_PACKAGE = 0;

const draftAtom = Atom.make<Draft>({ packageId: NO_PACKAGE, url: "" });

export const useBoothDraft = (packageId: number): string => {
  const draft = useAtomValue(draftAtom);
  if (draft.packageId === packageId) {
    return draft.url;
  }
  return "";
};

export const useSetBoothDraft = (): ((draft: Draft) => void) => useAtomSet(draftAtom);
