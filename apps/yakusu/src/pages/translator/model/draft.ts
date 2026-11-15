import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Duration } from "effect";
import { Atom } from "effect/reactivity";

export const MAX_CHARACTERS = 5000;

const TYPING_PAUSE = Duration.fromInputUnsafe("300 millis");

const draftAtom = Atom.make("");

const settledDraftAtom = Atom.debounce(draftAtom, TYPING_PAUSE);

export const useDraft = (): string => useAtomValue(draftAtom);

export const useSettledDraft = (): string => useAtomValue(settledDraftAtom);

export const useSetDraft = (): ((draft: string) => void) => useAtomSet(draftAtom);
