import type { Player } from "@masseater.dev/media-notes-ui";
import type { Clip } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

export type Pending = Readonly<{ clip: Clip; before: Option.Option<Player> }>;

/** @internal */
export const pendingAtom = Atom.make(Option.none<Pending>()).pipe(Atom.keepAlive);
