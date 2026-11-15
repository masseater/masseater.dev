import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkFallowEntries } from "./fallow-entries.ts";

const WORKSPACE = "packages:\n  - apps/*\n";

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({
    "pnpm-workspace.yaml": WORKSPACE,
    "apps/web/package.json": `{ "name": "web" }`,
    ...contents,
  });
  const files = yield* RepositoryFiles;
  const problems = yield* checkFallowEntries(root);
  const locations = pipe(
    problems,
    Arr.map(
      ({ file, line, column, rule }) => `${rule} ${files.relative(root, file)}:${line}:${column}`,
    ),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsListedFiles = Effect.gen(function* reportsListedFiles() {
  const found = yield* locationsIn({
    ".fallowrc.jsonc": `{\n  // entries\n  "entry": ["*/*/bin/*.ts", "apps/web/src/main.ts"],\n}\n`,
    "fallow-plugin-tools.jsonc": `{ "name": "tools", "entryPoints": ["apps/*/run.ts", "tools/a/b.ts"] }\n`,
  });
  expect(found).toStrictEqual([
    "listed-entry .fallowrc.jsonc:3:29",
    "listed-entry fallow-plugin-tools.jsonc:1:53",
  ]);
});

const acceptsConventions = Effect.gen(function* acceptsConventions() {
  const found = yield* locationsIn({
    ".fallowrc.jsonc": `{\n  "entry": ["*/*/bin/*.ts"],\n  "framework": [{ "name": "auth", "entryPoints": ["auth.config.ts", "src/app/server/index.{ts,tsx}"], "alwaysUsed": ["src/app/routeTree.gen.ts"] }],\n  "dynamicallyLoaded": ["apps/web/src/worker.ts"],\n}\n`,
  });
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("fallow entries", (it) => {
  it.effect("reports an entry pattern that names files one by one", () => reportsListedFiles);
  it.effect("accepts patterns that every workspace uses the same way", () => acceptsConventions);
});
