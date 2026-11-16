import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import { DIRECT } from "./ways.ts";

export type Choice =
  | { readonly status: "none" }
  | { readonly status: "chosen"; readonly name: string; readonly url: string };

const NO_CHOICE: Choice = { status: "none" };

const choiceAtom = Atom.make<Choice>(NO_CHOICE);

const apiKeyAtom = Atom.make("");

const wayAtom = Atom.make(DIRECT.key);

export const useChoice = (): Choice => useAtomValue(choiceAtom);

export const useSetChoice = (): ((choice: Choice) => void) => useAtomSet(choiceAtom);

export const useApiKey = (): string => useAtomValue(apiKeyAtom);

export const useSetApiKey = (): ((apiKey: string) => void) => useAtomSet(apiKeyAtom);

export const useWay = (): string => useAtomValue(wayAtom);

export const useSetWay = (): ((way: string) => void) => useAtomSet(wayAtom);
