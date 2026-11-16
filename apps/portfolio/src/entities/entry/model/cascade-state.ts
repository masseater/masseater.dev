import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

import { RUNNING } from "./cascade.ts";
import type { CascadeState } from "./cascade.ts";

export type Update = (update: (state: CascadeState) => CascadeState) => void;

const cascadeAtom = Atom.make<CascadeState>(RUNNING);

export const useCascadeState = (): CascadeState => useAtomValue(cascadeAtom);

export const useUpdateCascade = (): Update => useAtomSet(cascadeAtom);
