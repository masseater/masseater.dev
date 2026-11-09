import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Duration } from "effect";
import { Atom } from "effect/reactivity";

const MAX_CHARACTERS = 5000;

const TYPING_PAUSE = Duration.fromInputUnsafe("300 millis");

const draftAtom = Atom.make("");

const settledDraftAtom = Atom.debounce(draftAtom, TYPING_PAUSE);

const useDraft = (): string => useAtomValue(draftAtom);

const useSettledDraft = (): string => useAtomValue(settledDraftAtom);

const useSetDraft = (): ((draft: string) => void) => useAtomSet(draftAtom);

export { MAX_CHARACTERS, useDraft, useSetDraft, useSettledDraft };
