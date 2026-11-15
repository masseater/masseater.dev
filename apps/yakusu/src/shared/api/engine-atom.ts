import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import type { Engine } from "./engine.ts";
import { tauriEngine } from "./engine.ts";

/** @internal */
export const engineAtom = Atom.make<Engine>(tauriEngine);

export const useEngine = (): Engine => useAtomValue(engineAtom);
