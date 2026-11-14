import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import { gitRepositoryWith, fixtureLayer } from "./repository.test.support.ts";
import { workspaceLint } from "./workspace-lint.ts";

const RULE_SETS = { traced: { "eslint/no-restricted-properties": ["error", { object: "db" }] } };

const SHADCN = `{ "aliases": { "ui": "#/shared/ui" } }`;
const IMPORTS = `{ "name": "web", "imports": { "#/*": "./src/*" } }`;

const lintOf = Effect.fn("lintOf")(function* lintOf(files: Readonly<Record<string, string>>) {
  const root = yield* gitRepositoryWith(files);
  return yield* Effect.promise(() => workspaceLint({ root, ruleSets: RULE_SETS }));
});

const readsLiteralSettings = Effect.gen(function* readsLiteralSettings() {
  const lint = yield* lintOf({
    "apps/web/vite.config.ts": `import { defineConfig } from "vite-plus";

export default defineConfig(({ mode }) => ({
  msch: {
    lint: {
      ignorePatterns: ["upstream/**", "!upstream/keep.ts"],
      overrides: [
        { files: ["worker/**/*.ts"], excludeFiles: ["**/*.test.ts"], use: ["traced"] },
        { files: ["src/serve.ts"], rules: { "import/no-nodejs-modules": ["error", { allow: [\`node:http\`] }] } },
      ],
    },
  },
  mode,
}));
`,
    "apps/web/components.json": SHADCN,
    "apps/web/package.json": IMPORTS,
  });
  expect(lint).toStrictEqual({
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
  });
});

const rejectsRunningCode = Effect.gen(function* rejectsRunningCode() {
  const failure = yield* lintOf({
    "libs/core/vite.config.ts": `import { rules } from "./rules.ts";

export default { msch: { lint: { overrides: [{ files: ["src/**"], rules }] } } };
`,
  }).pipe(Effect.flip, Effect.catchDefect(Effect.succeed));
  expect(String(failure)).toContain("literal values");
});

const rejectsUnknownRuleSets = Effect.gen(function* rejectsUnknownRuleSets() {
  const failure = yield* lintOf({
    "libs/core/vite.config.ts": `export default { msch: { lint: { overrides: [{ files: ["src/**"], use: ["missing"] }] } } };
`,
  }).pipe(Effect.flip, Effect.catchDefect(Effect.succeed));
  expect(String(failure)).toContain("missing");
});

layer(fixtureLayer)("workspace lint", (it) => {
  it.effect(
    "reads msch.lint of each workspace without running it and roots its patterns",
    () => readsLiteralSettings,
  );
  it.effect("rejects msch.lint that needs the file to run", () => rejectsRunningCode);
  it.effect("rejects a rule set the root does not define", () => rejectsUnknownRuleSets);
});
