import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import { RUNNING } from "./cascade";
import type { CascadeState } from "./cascade";

type Update = (update: (state: CascadeState) => CascadeState) => void;

const cascadeAtom = Atom.make<CascadeState>(RUNNING);

const useCascadeState = (): CascadeState => useAtomValue(cascadeAtom);

const useUpdateCascade = (): Update => useAtomSet(cascadeAtom);

export type { Update };
export { useCascadeState, useUpdateCascade };
