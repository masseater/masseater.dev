import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import { tauriYohaku } from "./tauri-yohaku.ts";
import type { Yohaku } from "./yohaku.ts";

/** @internal */
export const yohakuAtom = Atom.make<Yohaku>(tauriYohaku);

export const useYohaku = (): Yohaku => useAtomValue(yohakuAtom);
