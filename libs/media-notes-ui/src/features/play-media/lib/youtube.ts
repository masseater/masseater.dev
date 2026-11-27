import { Effect, Option, Predicate, pipe } from "effect";
import type { Scope } from "effect";

import type { Mount, Player } from "#/shared/lib/player.ts";

const LOADED = 1;

const isCallback = (value: unknown): value is () => void => Predicate.isFunction(value);

const apiReady = (): boolean =>
  "YT" in globalThis &&
  pipe(
    Option.liftPredicate(YT, Predicate.hasProperty("loaded")),
    Option.exists(({ loaded }) => loaded === LOADED),
  );

const whenApiReady: Effect.Effect<void> = Effect.callback((resume) => {
  if (apiReady()) {
    resume(Effect.void);
    return;
  }
  const previous: unknown = pipe(
    Option.liftPredicate(globalThis, Predicate.hasProperty("onYouTubeIframeAPIReady")),
    Option.map((found) => found.onYouTubeIframeAPIReady),
    Option.getOrUndefined,
  );
  Reflect.set(globalThis, "onYouTubeIframeAPIReady", () => {
    if (isCallback(previous)) {
      previous();
    }
    resume(Effect.void);
  });
});

type Embedded = Readonly<{ player: Readonly<YT.Player>; host: HTMLElement }>;

const removed = ({ player, host }: Embedded): Effect.Effect<void> =>
  Effect.sync(() => {
    player.destroy();
    host.remove();
  });

const created = (mount: Mount): Effect.Effect<Embedded> =>
  Effect.callback((resume) => {
    const host = document.createElement("div");
    mount.stage.replaceChildren(host);
    const player = new YT.Player(host, {
      videoId: mount.opened.media.source.id,
      width: "100%",
      height: "100%",
      events: {
        onReady: (): void => {
          resume(Effect.succeed({ player, host }));
        },
      },
    });
    return removed({ player, host });
  });

const owned = (mount: Mount): Effect.Effect<Embedded, never, Scope.Scope> =>
  Effect.acquireRelease(created(mount), removed);

export const mountYoutube = (mount: Mount): Effect.Effect<Player, never, Scope.Scope> =>
  whenApiReady.pipe(
    Effect.andThen(owned(mount)),
    Effect.map(({ player }) => ({
      time: () => ({ current: player.getCurrentTime(), duration: player.getDuration() }),
      seek: (seconds: number): void => {
        player.seekTo(seconds, true);
      },
      toggle: (): void => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          return;
        }
        player.playVideo();
      },
    })),
  );
