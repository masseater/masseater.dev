import { convertFileSrc } from "@tauri-apps/api/core";
import { Effect } from "effect";
import type { Scope } from "effect";
import { constVoid } from "effect/Function";

import type { Mount, Player } from "#src/shared/lib/player.ts";

const START = 0;

const seconds = (value: number): number => {
  if (Number.isFinite(value)) {
    return value;
  }
  return START;
};

const placed = ({ stage, opened }: Mount): Effect.Effect<HTMLVideoElement> =>
  Effect.sync(() => {
    const video = document.createElement("video");
    video.src = convertFileSrc(opened.location);
    video.preload = "auto";
    video.playsInline = true;
    stage.replaceChildren(video);
    return video;
  });

const removed = ({ stage }: Mount): Effect.Effect<void> =>
  Effect.sync(() => {
    stage.replaceChildren();
  });

export const mountFile = (mount: Mount): Effect.Effect<Player, never, Scope.Scope> =>
  Effect.acquireRelease(placed(mount), () => removed(mount)).pipe(
    Effect.map((video) => ({
      time: () => ({ current: seconds(video.currentTime), duration: seconds(video.duration) }),
      seek: (to: number) => {
        video.currentTime = to;
      },
      toggle: () => {
        if (video.paused) {
          Effect.runFork(
            Effect.ignore(Effect.tryPromise({ try: () => video.play(), catch: constVoid })),
          );
          return;
        }
        video.pause();
      },
    })),
  );
