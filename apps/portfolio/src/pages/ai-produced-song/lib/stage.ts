import { mountSong } from "@masseater.dev/daw-view";
import { Effect, Fiber, Option } from "effect";

import { recordingOf } from "#/entities/song/index.ts";

export const stageOf =
  (slug: string) =>
  (root: HTMLElement): (() => void) => {
    const mounted = { dispose: Option.none<() => void>() };
    const loading = Effect.runFork(
      Option.match(recordingOf(slug), {
        onNone: () => Effect.void,
        onSome: (load) =>
          Effect.map(Effect.promise(load), (song) => {
            mounted.dispose = Option.some(mountSong(root)(song));
          }),
      }),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(loading));
      if (Option.isSome(mounted.dispose)) {
        mounted.dispose.value();
      }
    };
  };
