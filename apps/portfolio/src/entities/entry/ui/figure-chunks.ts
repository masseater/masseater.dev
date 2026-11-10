import { Effect, Option, Record as Rec } from "effect";
import { createElement } from "react";
import type { ReactElement } from "react";

import type { FigureName } from "#/entities/entry/model/figure";

const chunks = {
  "cascade-failure": Effect.promise(() => import("./cascade-failure")).pipe(
    Effect.map(({ CascadeFailure }) => createElement(CascadeFailure)),
  ),
} as const satisfies Record<FigureName, Effect.Effect<ReactElement>>;

const imported = new Map<FigureName, ReactElement>();

const importing = new Map<FigureName, Promise<ReactElement>>();

const started = (name: FigureName): Promise<ReactElement> => {
  const chunk = Effect.tap(chunks[name], (body) => Effect.sync(() => imported.set(name, body)));
  const promise = Effect.runPromise(chunk);
  importing.set(name, promise);
  return promise;
};

const importFigure = (name: FigureName): Promise<ReactElement> =>
  Option.getOrElse(Option.fromUndefinedOr(importing.get(name)), () => started(name));

const importedFigure = (name: FigureName): Option.Option<ReactElement> =>
  Option.fromUndefinedOr(imported.get(name));

const importFigures: Effect.Effect<void> = Effect.forEach(
  Rec.keys(chunks),
  (name) => Effect.promise(() => importFigure(name)),
  { discard: true },
);

export { importFigure, importFigures, importedFigure };
