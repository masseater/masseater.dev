import { useAtomSet } from "@effect/atom-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Array as Arr, Effect, Fiber, Option } from "effect";
import { constVoid } from "effect/Function";
import { useEffect } from "react";

import { openFileAtom } from "./open.ts";

const listening = (open: (path: string) => void): Effect.Effect<never> =>
  Effect.acquireRelease(
    Effect.promise(() =>
      getCurrentWebview().onDragDropEvent(({ payload }) => {
        if (payload.type === "drop") {
          Option.map(Arr.head(payload.paths), open);
        }
      }),
    ),
    (stop) => Effect.sync(stop),
  ).pipe(Effect.andThen(Effect.never), Effect.scoped);

export const useFileDrop = (enabled: boolean): void => {
  const open = useAtomSet(openFileAtom);
  useEffect(() => {
    if (!enabled) {
      return constVoid;
    }
    const fiber = Effect.runFork(listening(open));
    return (): void => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [enabled, open]);
};
