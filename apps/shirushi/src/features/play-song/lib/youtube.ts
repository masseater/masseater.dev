import { Effect } from "effect";
import type { Scope } from "effect";

import type { Mount, Player } from "#/shared/lib/player.ts";

const LOADED = 1;

const apiReady = (): boolean => "YT" in globalThis && Reflect.get(YT, "loaded") === LOADED;

const whenApiReady: Effect.Effect<void> = Effect.callback((resume) => {
  if (apiReady()) {
    resume(Effect.void);
    return;
  }
  const previous: unknown = Reflect.get(globalThis, "onYouTubeIframeAPIReady");
  Reflect.set(globalThis, "onYouTubeIframeAPIReady", () => {
    if (typeof previous === "function") {
      Reflect.apply(previous, globalThis, []);
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
      videoId: mount.source.id,
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
      seek: (seconds: number) => {
        player.seekTo(seconds, true);
      },
      toggle: () => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          return;
        }
        player.playVideo();
      },
    })),
  );
