import { useAtomValue } from "@effect/atom-react";
import { usePosition } from "@masseater.dev/media-notes-ui";
import type { Span } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Option } from "effect";

import { VERB_TONES } from "#/shared/config/index.ts";

import { heldAtom } from "./held.ts";

const KEY = "held";

export const useHeldSpans = (): readonly Span[] => {
  const held = useAtomValue(heldAtom);
  const { current } = usePosition();
  return Option.match(held, {
    onNone: Arr.empty,
    onSome: ({ verb, from }) => [
      {
        key: KEY,
        from: Math.min(from, current),
        to: Math.max(from, current),
        tone: VERB_TONES[verb],
      },
    ],
  });
};
