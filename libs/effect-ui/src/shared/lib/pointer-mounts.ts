import { Mount } from "@effect/ui";
import {
  followPointer,
  followViewportPointer,
  releasePointer,
  releaseStageLayers,
} from "@masseater.dev/ui/pointer";
import type { PointerSource, PointerStage } from "@masseater.dev/ui/pointer";
import { Effect, Stream } from "effect";

type Follow = (event: PointerSource) => void;
type Release = (event: PointerStage) => void;

const listening = (node: HTMLElement, follow: Follow, release: Release): Stream.Stream<never> =>
  Stream.unwrap(
    Effect.acquireRelease(
      Effect.sync(() => {
        const move = (event: PointerEvent): void => {
          follow({ currentTarget: node, clientX: event.clientX, clientY: event.clientY });
        };
        const leave = (): void => {
          release({ currentTarget: node });
        };
        node.addEventListener("pointermove", move);
        node.addEventListener("pointerleave", leave);
        node.addEventListener("pointercancel", leave);
        return { move, leave };
      }),
      ({ move, leave }) =>
        Effect.sync(() => {
          node.removeEventListener("pointermove", move);
          node.removeEventListener("pointerleave", leave);
          node.removeEventListener("pointercancel", leave);
        }),
    ).pipe(Effect.as(Stream.never)),
  );

/** @stability experimental */
export const FollowPointer = Mount.makeStream("FollowPointer", {}, (node: HTMLElement) =>
  listening(node, followPointer, releasePointer),
);

/** @stability experimental */
export const FollowViewportPointer = Mount.makeStream(
  "FollowViewportPointer",
  {},
  (node: HTMLElement) => listening(node, followViewportPointer, releaseStageLayers),
);
