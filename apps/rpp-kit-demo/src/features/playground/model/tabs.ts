import { useAtom } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

export type SourceTab = "main" | "rpp";

export type Tabs<Tab> = readonly [Tab, (tab: Tab) => void];

const sourceTabAtom = Atom.make<SourceTab>("main").pipe(Atom.keepAlive);

export const useSourceTab = (): Tabs<SourceTab> => useAtom(sourceTabAtom);
