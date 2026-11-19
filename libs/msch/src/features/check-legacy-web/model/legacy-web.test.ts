import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkLegacyWeb } from "./legacy-web.ts";

const REVERSED = "export const reversed = (items: readonly number[]): number[] =>";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    "package.json": '{ "name": "repo", "private": true }',
    ...files,
  });
  const problems = yield* checkLegacyWeb(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule} ${problem.message}`,
    ),
  );
});

const flagsLegacyScript = Effect.gen(function* flagsLegacyScript() {
  const findings = yield* findingsFor({
    "src/order.ts": `${REVERSED}\n  items.slice().reverse();\n`,
  });
  expect(findings).toStrictEqual([
    expect.stringMatching(
      /^src\/order\.ts:2 legacy-web js\/copying-array-methods: Use items\.toReversed\(\) .*modern-web-guidance retrieve js/u,
    ),
  ]);
});

const flagsLegacyInlineScript = Effect.gen(function* flagsLegacyInlineScript() {
  const findings = yield* findingsFor({
    "public/page.html":
      "<!doctype html>\n<script>\n  const out = [1, 2].slice().reverse();\n</script>\n",
  });
  expect(findings).toStrictEqual([
    expect.stringMatching(/^public\/page\.html:3 legacy-web js\/copying-array-methods: /u),
  ]);
});

const passesModernCode = Effect.gen(function* passesModernCode() {
  const findings = yield* findingsFor({
    "src/order.ts": `${REVERSED}\n  items.toReversed();\n`,
  });
  expect(findings).toStrictEqual([]);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("legacy web patterns", (it) => {
  it.effect("flags legacy patterns in scripts", () => flagsLegacyScript);
  it.effect("flags legacy patterns in inline HTML scripts", () => flagsLegacyInlineScript);
  it.effect("passes modern code", () => passesModernCode);
});
