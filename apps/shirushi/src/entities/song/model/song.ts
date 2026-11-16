import { Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Song } from "#protocol";

/** @internal */
export const songAtom = Atom.make(Option.none<Song>()).pipe(Atom.keepAlive);
