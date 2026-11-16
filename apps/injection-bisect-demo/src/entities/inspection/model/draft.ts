import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AUTO, DEFAULT_MODEL } from "@r_masseater/injection-bisect";
import type { Unreadable } from "@r_masseater/injection-bisect";
import { Array as Arr } from "effect";
import { Atom } from "effect/reactivity";

import { EXAMPLES } from "./examples.ts";

export type Run =
  | { readonly status: "idle" }
  | {
      readonly status: "started";
      readonly id: number;
      readonly text: string;
      readonly apiKey: string;
      readonly model: string;
      readonly format: string;
      readonly unreadable: readonly Unreadable[];
    };

export type Opening =
  | { readonly status: "idle" }
  | { readonly status: "reading"; readonly name: string }
  | { readonly status: "failed"; readonly name: string; readonly reason: string }
  | {
      readonly status: "partial";
      readonly name: string;
      readonly unreadable: readonly Unreadable[];
    };

export type Focus = { readonly status: "none" } | { readonly status: "probe"; readonly id: number };

const IDLE: Run = { status: "idle" };

export const NO_FOCUS: Focus = { status: "none" };

const [FIRST_EXAMPLE] = EXAMPLES;

const draftTextAtom = Atom.make(FIRST_EXAMPLE.text);

const apiKeyAtom = Atom.make("");

const modelAtom = Atom.make<string>(DEFAULT_MODEL);

const formatAtom = Atom.make<string>(AUTO);

export const NOT_OPENING: Opening = { status: "idle" };

export const openedOf =
  (name: string) =>
  (unreadable: readonly Unreadable[]): Opening => {
    if (Arr.isReadonlyArrayEmpty(unreadable)) {
      return NOT_OPENING;
    }
    return { status: "partial", name, unreadable };
  };

export const unreadableOf = (opening: Opening): readonly Unreadable[] => {
  if (opening.status === "partial") {
    return opening.unreadable;
  }
  return [];
};

const openingAtom = Atom.make<Opening>(NOT_OPENING);

const runAtom = Atom.make<Run>(IDLE);

const focusAtom = Atom.make<Focus>(NO_FOCUS);

export const useDraftText = (): string => useAtomValue(draftTextAtom);

export const useSetDraftText = (): ((text: string) => void) => useAtomSet(draftTextAtom);

export const useApiKey = (): string => useAtomValue(apiKeyAtom);

export const useSetApiKey = (): ((apiKey: string) => void) => useAtomSet(apiKeyAtom);

export const useModel = (): string => useAtomValue(modelAtom);

export const useSetModel = (): ((model: string) => void) => useAtomSet(modelAtom);

export const useFormat = (): string => useAtomValue(formatAtom);

export const useSetFormat = (): ((format: string) => void) => useAtomSet(formatAtom);

export const useOpening = (): Opening => useAtomValue(openingAtom);

export const useSetOpening = (): ((opening: Opening) => void) => useAtomSet(openingAtom);

export const useRun = (): Run => useAtomValue(runAtom);

export const useSetRun = (): ((run: Run) => void) => useAtomSet(runAtom);

export const useFocus = (): Focus => useAtomValue(focusAtom);

export const useSetFocus = (): ((focus: Focus) => void) => useAtomSet(focusAtom);
