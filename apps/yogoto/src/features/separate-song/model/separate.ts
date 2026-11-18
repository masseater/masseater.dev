import type { ModelInfo } from "@masseater.dev/yogoto-protocol";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import { jobsAtom } from "#/entities/job/index.ts";
import { separateSong } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/index.ts";

export type SeparateOrder = Readonly<{ songId: string; model: string }>;

/** @internal */
export const chosenModelAtom = Atom.make(Option.none<string>());

export const modelOf =
  (models: readonly ModelInfo[]) =>
  (chosen: Option.Option<string>): string =>
    pipe(
      chosen,
      Option.orElse(() => Option.map(Arr.head(models), (model) => model.id)),
      Option.getOrElse(() => ""),
    );

/** @internal */
export const separateAtom = runtime.fn(
  Effect.fnUntraced(function* separate({ songId, model }: SeparateOrder) {
    yield* separateSong(model)(songId);
    const registry = yield* AtomRegistry.AtomRegistry;
    registry.refresh(jobsAtom);
  }),
);
