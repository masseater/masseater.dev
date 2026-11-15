import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import { gitRepositoryWith, fixtureLayer } from "./repository.test.support.ts";
import { workspaceSettings } from "./workspace-settings.ts";

const RULE_SETS = { traced: { "eslint/no-restricted-properties": ["error", { object: "db" }] } };
const DEPENDENCY_SETS = { telemetry: ["@opentelemetry/sdk-trace-base"] };

const WORKSPACE = "packages:\n  - apps/*\n  - libs/*\n";
const MANIFEST = `{ "name": "web", "imports": { "#/*": "./src/*" } }`;
const SHADCN = `{ "aliases": { "ui": "#/shared/ui" } }`;

const settingsOf = Effect.fn("settingsOf")(function* settingsOf(
  files: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...files });
  return yield* Effect.promise(() =>
    workspaceSettings({ root, ruleSets: RULE_SETS, dependencySets: DEPENDENCY_SETS }),
  );
});

const WEB_CONFIG = `import { defineConfig } from "vite-plus";

export default defineConfig(({ mode }) => ({
  msch: {
    lint: {
      ignorePatterns: ["upstream/**", "!upstream/keep.ts"],
      overrides: [
        { files: ["worker/**/*.ts"], excludeFiles: ["**/*.test.ts"], use: ["traced"] },
        { files: ["src/serve.ts"], rules: { "import/no-nodejs-modules": ["error", { allow: [\`node:http\`] }] } },
      ],
    },
    devDependencies: { "spans are sent from the SDK in tests": { use: ["telemetry"], dependencies: ["miniflare"] } },
  },
  mode,
}));
`;

const readsLiteralSettings = Effect.gen(function* readsLiteralSettings() {
  const settings = yield* settingsOf({
    "apps/web/vite.config.ts": WEB_CONFIG,
    "apps/web/components.json": SHADCN,
    "apps/web/package.json": MANIFEST,
    "libs/own/package.json": `{ "name": "own" }`,
    "libs/own/vite.config.ts": `export default { run: { tasks: { test: "vp test run" } } };\n`,
    "libs/fixture/nested/vite.config.ts": `export default { msch: { lint: { ignorePatterns: ["x"] } } };\n`,
  });
  expect(settings).toStrictEqual({
    lint: {
      ignorePatterns: ["apps/web/upstream/**", "!apps/web/upstream/keep.ts"],
      overrides: [
        {
          files: ["apps/web/worker/**/*.ts"],
          excludeFiles: ["apps/web/**/*.test.ts"],
          rules: { "eslint/no-restricted-properties": ["error", { object: "db" }] },
        },
        {
          files: ["apps/web/src/serve.ts"],
          rules: { "import/no-nodejs-modules": ["error", { allow: ["node:http"] }] },
        },
      ],
      shadcnUi: ["apps/web/src/shared/ui/**"],
      publicEntries: [],
    },
    testProjects: ["apps/web"],
    tasks: { verify: [] },
    devDependencies: {
      "apps/web: spans are sent from the SDK in tests": {
        workspaces: ["apps/web"],
        dependencies: ["@opentelemetry/sdk-trace-base", "miniflare"],
      },
    },
  });
});

const readsTasks = Effect.gen(function* readsTasks() {
  const settings = yield* settingsOf({
    "libs/own/package.json": `{ "name": "own" }`,
    "libs/own/vite.config.ts": `export default { run: { tasks: { verify: { command: [], dependsOn: ["lint"] } } } };\n`,
    "libs/other/package.json": `{ "name": "other" }`,
    "libs/other/vite.config.ts": `export default { run: { tasks: { build: { command: "vp pack" } } } };\n`,
  });
  expect(settings.tasks).toStrictEqual({ verify: ["own#verify"] });
});

const rejectsRunningCode = Effect.gen(function* rejectsRunningCode() {
  const failure = yield* settingsOf({
    "libs/core/package.json": `{ "name": "core" }`,
    "libs/core/vite.config.ts": `import { rules } from "./rules.ts";

export default { msch: { lint: { overrides: [{ files: ["src/**"], rules }] } } };
`,
  }).pipe(Effect.flip, Effect.catchDefect(Effect.succeed));
  expect(String(failure)).toContain("literal values");
});

const rejectsUnknownSets = Effect.gen(function* rejectsUnknownSets() {
  const failure = yield* settingsOf({
    "libs/core/package.json": `{ "name": "core" }`,
    "libs/core/vite.config.ts": `export default { msch: { lint: { overrides: [{ files: ["src/**"], use: ["missing"] }] } } };
`,
  }).pipe(Effect.flip, Effect.catchDefect(Effect.succeed));
  expect(String(failure)).toContain("missing");
});

const listsPublicEntries = Effect.gen(function* listsPublicEntries() {
  const settings = yield* settingsOf({
    "libs/rule/package.json": `{ "name": "rule", "exports": { ".": "./src/index.ts", "./package.json": "./package.json" } }`,
    "libs/built/package.json": `{ "name": "built", "exports": { ".": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" }, "./strict": "./dist/strict.mjs" }, "bin": { "built": "./dist/cli.mjs" } }`,
    "libs/built/vite.config.ts": `export default { pack: { entry: ["src/index.ts", "src/strict.ts", "src/cli.ts"] } };\n`,
  });
  expect(settings.lint.publicEntries).toStrictEqual([
    "libs/built/src/index.ts",
    "libs/built/src/strict.ts",
    "libs/built/src/cli.ts",
    "libs/rule/src/index.ts",
  ]);
});

layer(fixtureLayer)("workspace settings", (it) => {
  it.effect(
    "reads msch settings and tasks of each workspace without running it, roots its patterns and leaves out workspaces that test themselves",
    () => readsLiteralSettings,
  );
  it.effect(
    "names the verify task of each workspace and the build of each workspace that exports dist",
    () => readsTasks,
  );
  it.effect("rejects msch settings that need the file to run", () => rejectsRunningCode);
  it.effect("rejects a set the root does not define", () => rejectsUnknownSets);
  it.effect(
    "lists the source files a package exposes, following dist targets back to pack entries",
    () => listsPublicEntries,
  );
});
