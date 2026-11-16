import { Effect, MutableRef } from "effect";
import type { Scope } from "effect";
import { createNiconicoEngine } from "niconico-embed-player";

import type { Mount, Player } from "#/shared/lib/player.ts";

export const mountNiconico = ({
  stage,
  source,
}: Mount): Effect.Effect<Player, never, Scope.Scope> => {
  const playing = MutableRef.make(false);
  const stopped = (): void => {
    MutableRef.set(playing, false);
  };
  const created = Effect.sync(() =>
    createNiconicoEngine(
      stage,
      { videoId: source.id, title: "niconico" },
      {
        onPlaying: () => {
          MutableRef.set(playing, true);
        },
        onPaused: stopped,
        onEnded: stopped,
      },
    ),
  );
  return Effect.acquireRelease(created, (engine) =>
    Effect.sync(() => {
      engine.destroy();
    }),
  ).pipe(
    Effect.map((engine) => ({
      time: () => engine.time(),
      seek: (seconds: number) => {
        engine.seek(seconds);
      },
      toggle: () => {
        if (MutableRef.get(playing)) {
          engine.pause();
          return;
        }
        engine.play();
      },
    })),
  );
};
