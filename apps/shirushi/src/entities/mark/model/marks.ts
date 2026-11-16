import { useAtomValue } from "@effect/atom-react";
import { Array as Arr } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { fetchMarks } from "#/shared/api/index.ts";
import type { Mark } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/runtime.ts";

/** @internal */
export const marksAtom = Atom.family((link: string) => runtime.atom(fetchMarks(link)));

export const useMarks = (link: string): readonly Mark[] =>
  AsyncResult.getOrElse(useAtomValue(marksAtom(link)), Arr.empty);
