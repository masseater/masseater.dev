import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

export type Page = "home" | "settings";

const pageAtom = Atom.make<Page>("home");

export const usePage = (): Page => useAtomValue(pageAtom);

export const useOpenPage = (): ((page: Page) => void) => useAtomSet(pageAtom);
