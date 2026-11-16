import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option, String as Str } from "effect";
import { useEffect } from "react";

import { anchorAtom, rangeAtom, spanOf } from "#/features/select-range/model/range.ts";
import { ignoredKey } from "#/shared/lib/keys.ts";
import type { Player } from "#/shared/lib/player.ts";

const KEY = "m";

export const useRangeKey = (player: Option.Option<Player>): void => {
  const anchor = useAtomValue(anchorAtom);
  const setAnchor = useAtomSet(anchorAtom);
  const setRange = useAtomSet(rangeAtom);
  useEffect(() => {
    const mark = (now: number): void => {
      Option.match(anchor, {
        onNone: () => {
          setAnchor(Option.some(now));
          setRange(Option.some({ from: now, to: now }));
        },
        onSome: (start) => {
          setAnchor(Option.none());
          setRange(Option.some(spanOf([start, now])));
        },
      });
    };
    const onKey = (event: KeyboardEvent): void => {
      if (Str.toLowerCase(event.key) !== KEY || ignoredKey(event)) {
        return;
      }
      if (Option.isSome(player)) {
        mark(player.value.time().current);
      }
    };
    globalThis.addEventListener("keydown", onKey);
    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [player, anchor, setAnchor, setRange]);
};
