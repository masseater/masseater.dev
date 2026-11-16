import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkDeployEntryPatterns } from "./deploy-entry-patterns.ts";

const WORKSPACE = "packages:\n  - apps/*\n";
const MODULE = "export default {};\n";
const STACK = `import { Stack } from "alchemy";

export default Stack.make("site", { main: "./src/app/site.worker.ts" });
`;

const SITE: Readonly<Record<string, string>> = {
  "pnpm-workspace.yaml": WORKSPACE,
  "apps/site/package.json": `{ "name": "site" }`,
  "apps/site/alchemy.run.ts": STACK,
  "apps/site/src/app/site.worker.ts": MODULE,
  "apps/site/src/app/router.ts": MODULE,
  "apps/site/src/features/edit-page/index.server.ts": MODULE,
};

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ ...SITE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkDeployEntryPatterns(root);
  const locations = pipe(
    problems,
    Arr.map(
      ({ file, line, column, rule }) => `${rule} ${files.relative(root, file)}:${line}:${column}`,
    ),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsPatternsThatSelectOnlyDeployEntries = Effect.gen(
  function* reportsPatternsThatSelectOnlyDeployEntries() {
    const found = yield* locationsIn({
      ".fallowrc.jsonc": `{\n  "framework": [{ "name": "workers", "entryPoints": ["src/**/*.worker.ts"] }],\n}\n`,
      "apps/site/vite.config.ts": `export default { lint: { overrides: [{ files: ["src/app/*.worker.{ts,tsx}"], use: ["traced"] }] } };\n`,
    });
    expect(found).toStrictEqual([
      "deploy-entry-pattern .fallowrc.jsonc:2:54",
      "deploy-entry-pattern apps/site/vite.config.ts:1:48",
    ]);
  },
);

const acceptsPatternsThatSelectOtherFiles = Effect.gen(
  function* acceptsPatternsThatSelectOtherFiles() {
    const found = yield* locationsIn({
      ".fallowrc.jsonc": `{ "entry": ["*/*/bin/*.ts"] }\n`,
      "apps/site/vite.config.ts": `export default { lint: { overrides: [{ files: ["src/app/*.ts", "src/**/*.server.ts"] }] } };\n`,
    });
    expect(found).toStrictEqual([]);
  },
);

layer(fixtureLayer)("checkDeployEntryPatterns", (it) => {
  it.effect(
    "reports a config pattern whose every match is a file an Alchemy resource names in main",
    () => reportsPatternsThatSelectOnlyDeployEntries,
  );
  it.effect(
    "accepts patterns that also select other files or no deploy entry",
    () => acceptsPatternsThatSelectOtherFiles,
  );
});
