import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { checkPublishedPackages } from "./install-size.ts";
import { sortProblems } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "./repository.test.support.ts";

const HEAVY_BYTES = 200_000;
const DEEP_BYTES = 50_000;
const LIGHT_BYTES = 10_000;
const PEER_BYTES = 500_000;
const EXPECTED_FINDINGS = 2;
const STACK_RULE = 1;

const configWith = (installSize: string): string =>
  `export default { msch: { publish: { installSize: "${installSize}" } } };\n`;

const filled = (bytes: number): string => Str.repeat(bytes)("x");

const publishedPackage = `{
  "name": "published",
  "exports": { ".": "./src/index.ts", "./extra": "./src/extra.ts" },
  "dependencies": { "heavy": "1.0.0", "light": "1.0.0", "shared": "catalog:stack" },
  "peerDependencies": { "peer": "1.0.0" }
}`;

const installed = {
  ".gitignore": "node_modules\n",
  "libs/published/src/index.ts":
    'import "light";\nimport type { Heavy } from "heavy";\nexport type { Heavy };\n',
  "libs/published/src/extra.ts": 'export * from "./util.ts";\n',
  "libs/published/src/util.ts": 'import "heavy";\n',
  "libs/published/node_modules/heavy/package.json": `{
    "dependencies": { "deep": "1.0.0" },
    "peerDependencies": { "peer": "1.0.0", "optional": "1.0.0" },
    "peerDependenciesMeta": { "optional": { "optional": true } }
  }`,
  "libs/published/node_modules/heavy/index.js": filled(HEAVY_BYTES),
  "libs/published/node_modules/light/package.json": "{}",
  "libs/published/node_modules/light/index.js": filled(LIGHT_BYTES),
  "libs/published/node_modules/shared/package.json": "{}",
  "node_modules/deep/package.json": "{}",
  "node_modules/deep/index.js": filled(DEEP_BYTES),
  "node_modules/peer/package.json": "{}",
  "node_modules/peer/index.js": filled(PEER_BYTES),
  "node_modules/optional/package.json": "{}",
  "node_modules/optional/index.js": filled(PEER_BYTES),
};

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkPublishedPackages(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule} ${problem.message}`,
    ),
  );
});

const flagsOverBudget = Effect.gen(function* flagsOverBudget() {
  const findings = yield* findingsFor({
    ...installed,
    "libs/published/package.json": publishedPackage,
    "libs/published/vite.config.ts": configWith("100 kB"),
  });
  const [stack, size] = findings;
  expect(findings).toHaveLength(EXPECTED_FINDINGS);
  expect(stack).toMatch(
    /^libs\/published\/package\.json:1 stack-dependency shared comes from the stack catalog/u,
  );
  expect(size).toContain(
    "libs/published/vite.config.ts:1 install-size installing this package adds 0.3 MB of dependencies besides its peers, over the 100 kB in msch.publish.installSize. Largest: heavy 0.3 MB (imported only from ./extra), light 0.0 MB (imported only from .), shared 0.0 MB.",
  );
});

const passesWithinBudget = Effect.gen(function* passesWithinBudget() {
  const findings = yield* findingsFor({
    ...installed,
    "libs/published/package.json": publishedPackage,
    "libs/published/vite.config.ts": configWith("1 MB"),
  });
  expect(
    pipe(
      findings,
      Arr.map((finding) => Str.split(finding, " ")[STACK_RULE]),
    ),
  ).toStrictEqual(["stack-dependency"]);
});

const skipsPrivatePackages = Effect.gen(function* skipsPrivatePackages() {
  const findings = yield* findingsFor({
    ...installed,
    "libs/published/package.json":
      '{ "name": "private", "private": true, "dependencies": { "heavy": "1.0.0" } }',
    "libs/published/vite.config.ts": configWith("0 B"),
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("install size", (it) => {
  it.effect(
    "flags a published package whose dependencies exceed msch.publish.installSize, leaving out its peers and optional peers",
    () => flagsOverBudget,
  );
  it.effect("passes a published package within its budget", () => passesWithinBudget);
  it.effect("skips a private package", () => skipsPrivatePackages);
});
