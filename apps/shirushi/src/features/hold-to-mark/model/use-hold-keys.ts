import { useAtom, useAtomSet } from "@effect/atom-react";
import { ignoredKey } from "@masseater.dev/media-notes-ui";
import type { Player } from "@masseater.dev/media-notes-ui";
import type { Verb } from "@masseater.dev/shirushi-protocol";
import { Option, String as Str, pipe } from "effect";
import { useEffect } from "react";

import { heldAtom } from "./held.ts";
import type { Held } from "./held.ts";
import { releaseAtom } from "./release.ts";

const KEYS: ReadonlyMap<string, Verb> = new Map([
  ["g", "like"],
  ["b", "dislike"],
]);

const verbOf = ({ key }: KeyboardEvent): Option.Option<Verb> =>
  Option.fromNullishOr(KEYS.get(Str.toLowerCase(key)));

const startable =
  (held: Option.Option<Held>) =>
  (event: KeyboardEvent): Option.Option<Verb> => {
    if (event.repeat || ignoredKey(event) || Option.isSome(held)) {
      return Option.none();
    }
    return verbOf(event);
  };

export const useHoldKeys = (player: Option.Option<Player>): void => {
  const [held, setHeld] = useAtom(heldAtom);
  const release = useAtomSet(releaseAtom);
  useEffect(() => {
    const now = pipe(
      player,
      Option.map(
        ({ time }) =>
          (): number =>
            time().current,
      ),
    );
    const onDown = (event: KeyboardEvent): void => {
      const start = Option.zipWith(startable(held)(event), now, (verb, clock) => ({
        verb,
        from: clock(),
      }));
      if (Option.isSome(start)) {
        setHeld(start);
      }
    };
    const finish = (): void => {
      if (Option.isSome(held) && Option.isSome(now)) {
        release(now.value());
      }
    };
    const onUp = (event: KeyboardEvent): void => {
      if (Option.exists(held, (holding) => Option.contains(verbOf(event), holding.verb))) {
        finish();
      }
    };
    globalThis.addEventListener("keydown", onDown);
    globalThis.addEventListener("keyup", onUp);
    globalThis.addEventListener("blur", finish);
    return (): void => {
      globalThis.removeEventListener("keydown", onDown);
      globalThis.removeEventListener("keyup", onUp);
      globalThis.removeEventListener("blur", finish);
    };
  }, [player, held, setHeld, release]);
};
