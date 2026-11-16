import type { Song } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

/** @internal */
export const songAtom = Atom.make(Option.none<Song>()).pipe(Atom.keepAlive);
