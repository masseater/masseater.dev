import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils";
import { Effect, Exit } from "effect";

import { loadSection } from "./config.ts";
import { directoryWith, lines } from "./fixture.test.support.ts";

const CONFIG = lines(
  "export default {",
  '  dependencyRules: { banned: { reason: ["left-pad"] } },',
  '  lint: { rules: { "eslint/no-console": "error" } },',
  "};",
);

const readsACustomSection = Effect.gen(function* readsACustomSection() {
  const root = yield* directoryWith({ "vite.config.ts": CONFIG });
  deepStrictEqual(yield* loadSection(root, "dependencyRules"), {
    banned: { reason: ["left-pad"] },
  });
});

const failsWhenTheSectionIsMissing = Effect.gen(function* failsWhenTheSectionIsMissing() {
  const root = yield* directoryWith({ "vite.config.ts": CONFIG });
  const exit = yield* Effect.exit(loadSection(root, "betterleaks"));
  assertTrue(Exit.isFailure(exit));
});

const failsWithoutAConfigFile = Effect.gen(function* failsWithoutAConfigFile() {
  const root = yield* directoryWith({ "package.json": "{}" });
  const exit = yield* Effect.exit(loadSection(root, "betterleaks"));
  assertTrue(Exit.isFailure(exit));
});

layer(fixtureLayer)("loading vite.config.ts", (it) => {
  it.effect("reads a custom section of vite.config.ts", () => readsACustomSection);
  it.effect("fails when the section is missing", () => failsWhenTheSectionIsMissing);
  it.effect("fails when there is no vite.config file", () => failsWithoutAConfigFile);
});
