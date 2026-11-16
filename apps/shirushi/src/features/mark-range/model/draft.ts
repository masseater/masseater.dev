import type { Aspect, Verb } from "@masseater.dev/shirushi-protocol";
import { Atom } from "effect/reactivity";

/** @internal */
export const verbAtom = Atom.make<Verb>("like").pipe(Atom.keepAlive);

/** @internal */
export const aspectsAtom = Atom.make<readonly Aspect[]>([]).pipe(Atom.keepAlive);

/** @internal */
export const wordsAtom = Atom.make("").pipe(Atom.keepAlive);
