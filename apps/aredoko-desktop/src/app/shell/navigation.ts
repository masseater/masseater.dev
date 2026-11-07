import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

type Page = "home" | "settings";

const pageAtom = Atom.make<Page>("home");

const usePage = (): Page => useAtomValue(pageAtom);

const useOpenPage = (): ((page: Page) => void) => useAtomSet(pageAtom);

export type { Page };
export { useOpenPage, usePage };
