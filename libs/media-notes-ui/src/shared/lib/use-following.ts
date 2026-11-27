import { listen } from "@tauri-apps/api/event";
import { Effect, Fiber } from "effect";
import { useEffect } from "react";

export type Following = Readonly<{ event: string; refresh: () => void }>;

const following = ({ event, refresh }: Following): Effect.Effect<never> =>
  Effect.acquireRelease(
    Effect.promise(() => listen(event, refresh)),
    (stop) => Effect.sync(stop),
  ).pipe(Effect.andThen(Effect.never), Effect.scoped);

export const useFollowing = ({ event, refresh }: Following): void => {
  useEffect(() => {
    const fiber = Effect.runFork(following({ event, refresh }));
    return (): void => {
      fiber.pipe(Fiber.interrupt, Effect.runFork);
    };
  }, [event, refresh]);
};
