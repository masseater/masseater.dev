import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AUTO, DEFAULT_MODEL } from "@r_masseater/injection-bisect";
import type { Unreadable } from "@r_masseater/injection-bisect";
import { Array as Arr } from "effect";
import { Atom } from "effect/reactivity";

import { EXAMPLES } from "./examples";

type Run =
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

type Opening =
  | { readonly status: "idle" }
  | { readonly status: "reading"; readonly name: string }
  | { readonly status: "failed"; readonly name: string; readonly reason: string }
  | {
      readonly status: "partial";
      readonly name: string;
      readonly unreadable: readonly Unreadable[];
    };

type Focus = { readonly status: "none" } | { readonly status: "probe"; readonly id: number };

const IDLE: Run = { status: "idle" };

const NO_FOCUS: Focus = { status: "none" };

const [FIRST_EXAMPLE] = EXAMPLES;

const draftTextAtom = Atom.make(FIRST_EXAMPLE.text);

const apiKeyAtom = Atom.make("");

const modelAtom = Atom.make<string>(DEFAULT_MODEL);

const formatAtom = Atom.make<string>(AUTO);

const NOT_OPENING: Opening = { status: "idle" };

const openedOf =
  (name: string) =>
  (unreadable: readonly Unreadable[]): Opening => {
    if (Arr.isReadonlyArrayEmpty(unreadable)) {
      return NOT_OPENING;
    }
    return { status: "partial", name, unreadable };
  };

const unreadableOf = (opening: Opening): readonly Unreadable[] => {
  if (opening.status === "partial") {
    return opening.unreadable;
  }
  return [];
};

const openingAtom = Atom.make<Opening>(NOT_OPENING);

const runAtom = Atom.make<Run>(IDLE);

const focusAtom = Atom.make<Focus>(NO_FOCUS);

const useDraftText = (): string => useAtomValue(draftTextAtom);

const useSetDraftText = (): ((text: string) => void) => useAtomSet(draftTextAtom);

const useApiKey = (): string => useAtomValue(apiKeyAtom);

const useSetApiKey = (): ((apiKey: string) => void) => useAtomSet(apiKeyAtom);

const useModel = (): string => useAtomValue(modelAtom);

const useSetModel = (): ((model: string) => void) => useAtomSet(modelAtom);

const useFormat = (): string => useAtomValue(formatAtom);

const useSetFormat = (): ((format: string) => void) => useAtomSet(formatAtom);

const useOpening = (): Opening => useAtomValue(openingAtom);

const useSetOpening = (): ((opening: Opening) => void) => useAtomSet(openingAtom);

const useRun = (): Run => useAtomValue(runAtom);

const useSetRun = (): ((run: Run) => void) => useAtomSet(runAtom);

const useFocus = (): Focus => useAtomValue(focusAtom);

const useSetFocus = (): ((focus: Focus) => void) => useAtomSet(focusAtom);

export type { Focus, Opening, Run };
export {
  NOT_OPENING,
  NO_FOCUS,
  openedOf,
  unreadableOf,
  useApiKey,
  useDraftText,
  useFocus,
  useFormat,
  useModel,
  useOpening,
  useRun,
  useSetApiKey,
  useSetDraftText,
  useSetFocus,
  useSetFormat,
  useSetModel,
  useSetOpening,
  useSetRun,
};
