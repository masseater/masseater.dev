import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Array as Arr, String as Str, pipe } from "effect";

import { directoryWith } from "./fixture.test.support.ts";
import { checkSlices } from "./steiger.ts";
import type { SteigerConfig } from "./types.ts";

const configWith = (severity: "error" | "warn"): SteigerConfig => [
  {
    meta: { name: "fixture", version: "0.0.0" },
    ruleDefinitions: [
      {
        name: "fixture/no-shared",
        check: (root) => ({
          diagnostics: pipe(
            root.children,
            Arr.filter((child) => Str.endsWith("shared")(child.path)),
            Arr.map((child) => ({ message: "no shared layer", location: { path: child.path } })),
          ),
        }),
      },
    ],
  },
  { rules: { "fixture/no-shared": severity } },
];

const SLICES = { "src/shared/index.ts": "export {};\n" };

const failsOnErrors = Effect.gen(function* failsOnErrors() {
  const root = yield* directoryWith(SLICES);
  const report = yield* checkSlices(configWith("error"), root, ["src"]);
  assertFalse(report.valid);
  strictEqual(report.output, "error src/shared: no shared layer (fixture/no-shared)");
});

const passesOnWarnings = Effect.gen(function* passesOnWarnings() {
  const root = yield* directoryWith(SLICES);
  assertTrue((yield* checkSlices(configWith("warn"), root, ["src"])).valid);
});

layer(fixtureLayer)("checking slices", (it) => {
  it.effect("fails on an error diagnostic and prints it relative to the root", () => failsOnErrors);
  it.effect("passes when the diagnostics are only warnings", () => passesOnWarnings);
});
