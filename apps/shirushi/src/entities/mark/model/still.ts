import { useAtomValue } from "@effect/atom-react";
import { runtime } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { Option } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { fetchStill } from "#/shared/api/index.ts";

const stillOf = (
  id: string,
): Atom.Atom<AsyncResult.AsyncResult<Option.Option<string>, ApiFailed>> =>
  runtime.atom(fetchStill(id));

const stillAtom = Atom.family(stillOf);

export const useStill = (id: string): Option.Option<string> => {
  const still = useAtomValue(stillAtom(id));
  return Option.flatten(AsyncResult.value(still));
};
