import { Array as Arr, Effect, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { techniqueList } from "#/entities/technique";

import { loadEffect } from "./effects";

const missingSlug = (slug: string): Effect.Effect<Option.Option<string>> =>
  pipe(
    loadEffect(slug),
    Effect.map(Option.match({ onNone: () => Option.some(slug), onSome: () => Option.none() })),
  );

const missingSlugs = pipe(
  techniqueList,
  Arr.map(({ slug }) => missingSlug(slug)),
  (checks) => Effect.all(checks, { concurrency: "unbounded" }),
  Effect.map(Arr.getSomes),
);

test("すべての手法にセイキンダンス版の効果がある", () =>
  expect(Effect.runPromise(missingSlugs)).resolves.toStrictEqual([]));
