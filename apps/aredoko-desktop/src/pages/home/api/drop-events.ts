import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Effect, Fiber } from "effect";

interface DropHandlers {
  readonly onHover: (over: boolean) => void;
  readonly onDrop: (paths: readonly string[]) => void;
}

const subscribeDrops = ({ onHover, onDrop }: DropHandlers): (() => void) => {
  const listening = Effect.acquireRelease(
    Effect.promise(() =>
      getCurrentWebview().onDragDropEvent(({ payload }) => {
        if (payload.type === "drop") {
          onHover(false);
          onDrop(payload.paths);
          return;
        }
        onHover(payload.type !== "leave");
      }),
    ),
    (stop) => Effect.sync(stop),
  ).pipe(Effect.andThen(Effect.never), Effect.scoped);
  const fiber = Effect.runFork(listening);
  return (): void => {
    Effect.runFork(Fiber.interrupt(fiber));
  };
};

export { subscribeDrops };
