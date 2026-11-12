import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import { tauriYohaku } from "./tauri-yohaku.ts";
import type { Yohaku } from "./yohaku.ts";

/** @internal */
const yohakuAtom = Atom.make<Yohaku>(tauriYohaku);

const useYohaku = (): Yohaku => useAtomValue(yohakuAtom);

export { useYohaku, yohakuAtom };
