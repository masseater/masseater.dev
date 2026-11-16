import { openedAtom, runtime } from "@masseater.dev/media-notes-ui";
import { Effect, Option } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { marksAtom, posted } from "#/entities/mark/index.ts";
import { forecastsAtom } from "#/entities/taste/index.ts";

import { heldAtom } from "./held.ts";

const SHORTEST = 1;

const EMPTY = "";

/** @internal */
export const releaseAtom = runtime.fn(
  Effect.fnUntraced(function* release(now: number) {
    const registry = yield* AtomRegistry.AtomRegistry;
    const held = yield* Effect.fromOption(registry.get(heldAtom));
    const opened = yield* Effect.fromOption(registry.get(openedAtom));
    registry.set(heldAtom, Option.none());
    const from = Math.min(held.from, now);
    const to = Math.max(held.from, now, from + SHORTEST);
    yield* posted(opened)({
      song: opened.media,
      from,
      to,
      verb: held.verb,
      aspects: [],
      words: EMPTY,
    });
    registry.refresh(marksAtom);
    registry.refresh(forecastsAtom);
  }),
);
