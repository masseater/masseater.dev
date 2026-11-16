import { Match } from "effect";
import type { Effect, Scope } from "effect";

import type { Mount, Player } from "#/shared/lib/player.ts";

import { mountNiconico } from "./niconico.ts";
import { mountSoundcloud } from "./soundcloud.ts";
import { mountYoutube } from "./youtube.ts";

export const mountPlayer = (mount: Mount): Effect.Effect<Player, never, Scope.Scope> =>
  Match.value(mount.source.site).pipe(
    Match.when("youtube", () => mountYoutube(mount)),
    Match.when("niconico", () => mountNiconico(mount)),
    Match.when("soundcloud", () => mountSoundcloud(mount)),
    Match.exhaustive,
  );
