import { KeyValueStore } from "effect/persistence";
import { Atom } from "effect/reactivity";

/** @internal */
export const runtime = Atom.runtime(KeyValueStore.layerStorage(() => globalThis.localStorage));
