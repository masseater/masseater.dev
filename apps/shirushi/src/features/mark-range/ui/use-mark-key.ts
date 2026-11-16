import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option, String as Str, pipe } from "effect";
import { useEffect } from "react";

import { anchorAtom, rangeAtom, spanOf } from "#/features/mark-range/model/draft";
import type { Player } from "#/shared/lib/player";

const KEY = "m";
const FIELD = "input, textarea, select, [contenteditable]";

const MODIFIERS = ["ctrlKey", "metaKey", "altKey", "isComposing"] as const;

const inField = ({ target }: KeyboardEvent): boolean =>
  target instanceof Element && target.closest(FIELD) !== null;

const ignored = (event: KeyboardEvent): boolean =>
  pipe(
    MODIFIERS,
    Arr.some((key) => event[key]),
  ) || inField(event);

export const useMarkKey = (player: Option.Option<Player>): void => {
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
      if (Str.toLowerCase(event.key) !== KEY || ignored(event)) {
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
