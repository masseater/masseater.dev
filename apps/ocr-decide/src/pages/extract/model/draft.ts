import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import { DIRECT } from "./ways";

type Choice =
  | { readonly status: "none" }
  | { readonly status: "chosen"; readonly name: string; readonly url: string };

const NO_CHOICE: Choice = { status: "none" };

const choiceAtom = Atom.make<Choice>(NO_CHOICE);

const apiKeyAtom = Atom.make("");

const wayAtom = Atom.make(DIRECT.key);

const useChoice = (): Choice => useAtomValue(choiceAtom);

const useSetChoice = (): ((choice: Choice) => void) => useAtomSet(choiceAtom);

const useApiKey = (): string => useAtomValue(apiKeyAtom);

const useSetApiKey = (): ((apiKey: string) => void) => useAtomSet(apiKeyAtom);

const useWay = (): string => useAtomValue(wayAtom);

const useSetWay = (): ((way: string) => void) => useAtomSet(wayAtom);

export type { Choice };
export { useApiKey, useChoice, useSetApiKey, useSetChoice, useSetWay, useWay };
