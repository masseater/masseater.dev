import { Effect, Option, Record as Rec, pipe } from "effect";
import { createElement } from "react";
import type { ReactElement } from "react";

import type { FigureName } from "#/entities/entry/model/figure.ts";
import { once } from "#/shared/lib/index.ts";

const imports = {
  "cascade-failure": Effect.promise(() => import("./cascade-failure.tsx")).pipe(
    Effect.map(({ CascadeFailure }) => createElement(CascadeFailure)),
  ),
} as const satisfies Record<FigureName, Effect.Effect<ReactElement>>;

const loaded = new Map<FigureName, ReactElement>();

const chunks = pipe(
  imports,
  Rec.map((load, name) =>
    once(() =>
      Effect.runPromise(Effect.tap(load, (body) => Effect.sync(() => loaded.set(name, body)))),
    ),
  ),
);

export const importFigure = (name: FigureName): Promise<ReactElement> => chunks[name]();

export const importedFigure = (name: FigureName): Option.Option<ReactElement> =>
  Option.fromUndefinedOr(loaded.get(name));

export const importFigures: Effect.Effect<void> = Effect.forEach(
  Rec.keys(chunks),
  (name) => Effect.promise(() => importFigure(name)),
  { concurrency: 1, discard: true },
);
