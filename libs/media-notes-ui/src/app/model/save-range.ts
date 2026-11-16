import type { Opened } from "@masseater.dev/media-notes-protocol";
import { Effect, Option } from "effect";
import type { Cause } from "effect";
import { AtomRegistry } from "effect/reactivity";

import { openedAtom } from "#/entities/media/index.ts";
import { anchorAtom, rangeAtom } from "#/features/select-range/index.ts";
import type { Range } from "#/features/select-range/index.ts";

export type Post<Failure> = (opened: Opened, range: Range) => Effect.Effect<void, Failure>;

/** @internal */
export const savedRange = <Failure>(
  post: Post<Failure>,
): Effect.Effect<
  AtomRegistry.AtomRegistry,
  Failure | Cause.NoSuchElementError,
  AtomRegistry.AtomRegistry
> =>
  Effect.gen(function* saving() {
    const registry = yield* AtomRegistry.AtomRegistry;
    const opened = yield* Effect.fromOption(registry.get(openedAtom));
    const range = yield* Effect.fromOption(registry.get(rangeAtom));
    yield* post(opened, range);
    registry.set(rangeAtom, Option.none());
    registry.set(anchorAtom, Option.none());
    return registry;
  });
