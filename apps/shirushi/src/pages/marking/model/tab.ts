import { Atom } from "effect/reactivity";

export type TabId = "marks" | "pairs" | "statements";

/** @internal */
export const tabAtom = Atom.make<TabId>("marks").pipe(Atom.keepAlive);
