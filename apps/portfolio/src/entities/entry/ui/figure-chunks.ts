import { Effect, Option, Record as Rec } from "effect";
import { createElement } from "react";
import type { ReactElement } from "react";

import type { FigureName } from "#/entities/entry/model/figure.ts";

type FigureChunk =
  | { readonly status: "idle" }
  | { readonly status: "importing"; readonly promise: Promise<ReactElement> }
  | { readonly status: "imported"; readonly body: ReactElement };

const chunks = {
  "cascade-failure": Effect.promise(() => import("./cascade-failure.tsx")).pipe(
    Effect.map(({ CascadeFailure }) => createElement(CascadeFailure)),
  ),
} as const satisfies Record<FigureName, Effect.Effect<ReactElement>>;

const figures = new Map<FigureName, FigureChunk>();

const figureOf = (name: FigureName): FigureChunk => figures.get(name) ?? { status: "idle" };

const started = (name: FigureName): Promise<ReactElement> => {
  const chunk = Effect.tap(chunks[name], (body) =>
    Effect.sync(() => figures.set(name, { status: "imported", body })),
  );
  const promise = Effect.runPromise(chunk);
  figures.set(name, { status: "importing", promise });
  return promise;
};

export const importFigure = (name: FigureName): Promise<ReactElement> => {
  const figure = figureOf(name);
  if (figure.status === "idle") {
    return started(name);
  }
  if (figure.status === "importing") {
    return figure.promise;
  }
  return Promise.resolve(figure.body);
};

export const importedFigure = (name: FigureName): Option.Option<ReactElement> => {
  const figure = figureOf(name);
  if (figure.status === "imported") {
    return Option.some(figure.body);
  }
  return Option.none();
};

export const importFigures: Effect.Effect<void> = Effect.forEach(
  Rec.keys(chunks),
  (name) => Effect.promise(() => importFigure(name)),
  { discard: true },
);
