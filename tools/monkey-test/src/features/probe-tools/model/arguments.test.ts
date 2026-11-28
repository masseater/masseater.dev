import { it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { attemptsOf } from "./arguments.ts";

const SEED = 20_000;
const OTHER_SEED = 20_001;

const schema = {
  type: "object",
  properties: {
    query: { type: "string" },
    limit: { type: "integer" },
    mode: { type: "string", enum: ["brief", "full"] },
  },
  required: ["query", "mode"],
};

const labelsOf = (seed: number): Effect.Effect<readonly string[]> =>
  attemptsOf({ schema, seed }).pipe(Effect.map(Arr.map(({ label }) => label)));

it.effect("starts from a valid call built from the required fields", () =>
  Effect.gen(function* validFirst() {
    const attempts = yield* attemptsOf({ schema, seed: SEED });
    expect(attempts).toHaveProperty("0", {
      label: "valid",
      arguments: { query: "monkey", mode: "brief" },
    });
  }),
);

it.effect("replays the same attempts for the same seed and rotates them for another", () =>
  Effect.gen(function* replayed() {
    const first = yield* labelsOf(SEED);
    const again = yield* labelsOf(SEED);
    const other = yield* labelsOf(OTHER_SEED);
    expect(again).toStrictEqual(first);
    expect(other).not.toStrictEqual(first);
  }),
);

it.effect("breaks one thing at a time", () =>
  Effect.gen(function* oneAtATime() {
    const labels = yield* labelsOf(SEED);
    const wrong = pipe(
      labels,
      Arr.filter((label) => label !== "valid"),
    );
    expect(wrong).not.toStrictEqual([]);
    expect(
      pipe(
        wrong,
        Arr.every((label) => /[=]|without|unknown/u.test(label)),
      ),
    ).toBe(true);
  }),
);

it.effect("copes with a schema that says nothing", () =>
  Effect.gen(function* nothingSaid() {
    const attempts = yield* attemptsOf({ schema: {}, seed: SEED });
    expect(attempts).toHaveProperty("0", { label: "valid", arguments: {} });
  }),
);
