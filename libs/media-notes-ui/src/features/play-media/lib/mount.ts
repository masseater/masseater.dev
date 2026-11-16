import { Match } from "effect";
import type { Effect, Scope } from "effect";

import type { Mount, Player } from "#src/shared/lib/player.ts";

import { mountFile } from "./file.ts";
import { mountNiconico } from "./niconico.ts";
import { mountSoundcloud } from "./soundcloud.ts";
import { mountYoutube } from "./youtube.ts";

export const mountPlayer = (mount: Mount): Effect.Effect<Player, never, Scope.Scope> =>
  Match.value(mount.opened.media.source.site).pipe(
    Match.when("youtube", () => mountYoutube(mount)),
    Match.when("niconico", () => mountNiconico(mount)),
    Match.when("soundcloud", () => mountSoundcloud(mount)),
    Match.when("file", () => mountFile(mount)),
    Match.exhaustive,
  );
