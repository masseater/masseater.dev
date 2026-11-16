import { Layer } from "effect";
import { Atom } from "effect/reactivity";

/** @internal */
export const runtime = Atom.runtime(Layer.empty);
