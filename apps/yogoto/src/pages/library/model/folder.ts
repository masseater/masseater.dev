import { Atom } from "effect/reactivity";

import { folderOf } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/index.ts";

/** @internal */
export const folderAtom = Atom.family((id: string) => runtime.atom(folderOf(id)));
