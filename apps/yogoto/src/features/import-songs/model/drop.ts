import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Effect, Fiber } from "effect";
import { Atom } from "effect/reactivity";
import { useEffect } from "react";

const hoveringAtom = Atom.make(false);

type Listen = Readonly<{
  onDrop: (paths: readonly string[]) => void;
  onHover: (hovering: boolean) => void;
}>;

const listening = ({ onDrop, onHover }: Listen): Effect.Effect<never> =>
  Effect.acquireRelease(
    Effect.promise(() =>
      getCurrentWebview().onDragDropEvent(({ payload }) => {
        if (payload.type === "drop") {
          onDrop(payload.paths);
        }
        onHover(payload.type === "enter" || payload.type === "over");
      }),
    ),
    (stop) =>
      Effect.sync(() => {
        stop();
      }),
  ).pipe(Effect.andThen(Effect.never), Effect.scoped);

export const useDroppedFiles = (onDrop: (paths: readonly string[]) => void): boolean => {
  const hovering = useAtomValue(hoveringAtom);
  const onHover = useAtomSet(hoveringAtom);
  useEffect(() => {
    const fiber = Effect.runFork(listening({ onDrop, onHover }));
    return (): void => {
      fiber.pipe(Fiber.interrupt, Effect.runFork);
    };
  }, [onDrop, onHover]);
  return hovering;
};
