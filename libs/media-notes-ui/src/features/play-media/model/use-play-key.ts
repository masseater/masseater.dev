import { Option } from "effect";
import { useEffect } from "react";

import { ignoredKey } from "#/shared/lib/keys.ts";
import type { Player } from "#/shared/lib/player.ts";

const KEY = " ";

export const usePlayKey = (player: Option.Option<Player>): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== KEY || ignoredKey(event) || Option.isNone(player)) {
        return;
      }
      event.preventDefault();
      player.value.toggle();
    };
    globalThis.addEventListener("keydown", onKey);
    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [player]);
};
