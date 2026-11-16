import { useAtomRefresh } from "@effect/atom-react";
import { listen } from "@tauri-apps/api/event";
import { Effect, Fiber } from "effect";
import { useEffect } from "react";

import { commentsAtom } from "./comments.ts";

const CHANGED = "akapen://comments-changed";

const following = (refresh: () => void): Effect.Effect<never> =>
  Effect.acquireRelease(
    Effect.promise(() => listen(CHANGED, refresh)),
    (stop) => Effect.sync(stop),
  ).pipe(Effect.andThen(Effect.never), Effect.scoped);

export const useFollowing = (): void => {
  const refresh = useAtomRefresh(commentsAtom);
  useEffect(() => {
    const fiber = Effect.runFork(following(refresh));
    return (): void => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [refresh]);
};
