import { Effect, Record as Rec, pipe } from "effect";
import { lazy } from "react";
import type { ComponentType } from "react";

import type { FigureName } from "#/entities/entry/model/figure.ts";

interface FigureModule {
  readonly default: ComponentType;
}

const loaders = {
  "cascade-failure": () =>
    Effect.runPromise(
      Effect.promise(() => import("./cascade-failure.tsx")).pipe(
        Effect.map(({ CascadeFailure }): FigureModule => ({ default: CascadeFailure })),
      ),
    ),
} as const satisfies Record<FigureName, () => Promise<FigureModule>>;

export const figures = pipe(loaders, Rec.map(lazy));

export const importFigures: Effect.Effect<void> = Effect.forEach(
  Rec.values(loaders),
  (load) => Effect.promise(load),
  { concurrency: 1, discard: true },
);
