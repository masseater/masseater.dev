import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkVitePlus } from "./vite-plus-checks.ts";

const BLOCK_START = Arr.join(["<!--", "VITE PLUS START", "-->"], "");
const WORKSPACE_FILE = "packages:\n  - apps/*\n";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkVitePlus(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsScriptsThatAreNotLifecycleScripts = Effect.gen(
  function* flagsScriptsThatAreNotLifecycleScripts() {
    const findings = yield* findingsFor({
      "package.json":
        '{\n  "scripts": {\n    "prepare": "vp config",\n    "test": "vp test run",\n    "lint:design": "design.md lint DESIGN.md"\n  }\n}\n',
      "apps/site/package.json":
        '{\n  "scripts": {\n    "postinstall": "node setup.ts",\n    "prepublishOnly": "vp run build"\n  }\n}\n',
    });
    expect(findings).toStrictEqual([
      "package.json:4 package-script",
      "package.json:5 package-script",
    ]);
  },
);

const flagsPackageManagersInEveryCommandSurface = Effect.gen(
  function* flagsPackageManagersInEveryCommandSurface() {
    const findings = yield* findingsFor({
      "pnpm-workspace.yaml": WORKSPACE_FILE,
      "package.json":
        '{\n  "scripts": {\n    "prepare": "vp config && pnpm exec skills install"\n  }\n}\n',
      "vite.config.ts":
        'export default {\n  run: {\n    tasks: {\n      size: "npx size-limit",\n      verify: { command: ["vp check", "pnpm audit"], dependsOn: ["size"] },\n    },\n  },\n};\n',
      "apps/site/package.json": '{ "name": "site" }\n',
      "apps/site/vite.config.ts":
        'export default {\n  run: { tasks: { deploy: { command: "bunx alchemy deploy", cache: false } } },\n};\n',
      ".github/workflows/verify.yml":
        "jobs:\n  verify:\n    steps:\n      - run: pnpm install --frozen-lockfile\n      - run: vp run verify\n",
      ".github/actions/setup/action.yml":
        "runs:\n  using: composite\n  steps:\n    - run: CI=1 npm ci\n      shell: bash\n",
      ".vite-hooks/pre-push": "vp run verify\nyarn test\n",
      ".mcp.json":
        '{\n  "mcpServers": {\n    "docs": { "command": "npx", "args": ["-y", "docs-mcp"] },\n    "fallow": { "command": "vp", "args": ["exec", "fallow-mcp"] }\n  }\n}\n',
    });
    expect(findings).toStrictEqual([
      ".github/actions/setup/action.yml:4 package-manager-command",
      ".github/workflows/verify.yml:4 package-manager-command",
      ".mcp.json:3 package-manager-command",
      ".vite-hooks/pre-push:2 package-manager-command",
      "apps/site/vite.config.ts:2 package-manager-command",
      "package.json:3 package-manager-command",
      "vite.config.ts:4 package-manager-command",
      "vite.config.ts:5 package-manager-command",
    ]);
  },
);

const passesCommandsThatOnlyNameAPackageManager = Effect.gen(
  function* passesCommandsThatOnlyNameAPackageManager() {
    const findings = yield* findingsFor({
      "package.json":
        '{\n  "scripts": {\n    "prepublishOnly": "node -e \\"console.error(\'npm publish leaves catalog: behind; use pnpm\')\\" && vp run build"\n  }\n}\n',
      "vite.config.ts":
        'export default {\n  run: { tasks: { pack: "vp pm pack", audit: "vp exec pnpm-audit-export" } },\n};\n',
      ".github/workflows/verify.yml":
        'jobs:\n  verify:\n    steps:\n      - run: echo "pnpm install is not needed"\n      - run: vp install\n',
      "apps/server/Dockerfile": "FROM node:26\nRUN npm install --omit=dev\n",
      "docs/setup.md": "pnpm install で依存を入れる。\n",
    });
    expect(findings).toStrictEqual([]);
  },
);

const flagsSkippedGatesAndFilterTasks = Effect.gen(function* flagsSkippedGatesAndFilterTasks() {
  const findings = yield* findingsFor({
    "vite.config.ts":
      'export default {\n  run: {\n    tasks: {\n      push: "git push --no-verify",\n      land: "gh pr merge 12 --squash --admin",\n      web: "vp run --filter web build",\n      all: "vp run -r build",\n      merge: "gh pr merge 12 --squash",\n    },\n  },\n};\n',
    ".github/workflows/merge.yml":
      "jobs:\n  merge:\n    steps:\n      - run: git commit --no-verify -m release\n      - run: vp run --filter web deploy\n",
  });
  expect(findings).toStrictEqual([
    ".github/workflows/merge.yml:4 skipped-gate",
    "vite.config.ts:4 skipped-gate",
    "vite.config.ts:5 skipped-gate",
    "vite.config.ts:6 filter-task",
  ]);
});

const flagsTheVitePlusBlockInAgentDocs = Effect.gen(function* flagsTheVitePlusBlockInAgentDocs() {
  const findings = yield* findingsFor({
    "AGENTS.md": `# AGENTS.md\n\n${BLOCK_START}\n\n# Using Vite+\n`,
    "apps/site/AGENTS.md": "# site\n",
    "docs/vite-plus.md": `${BLOCK_START}\n`,
  });
  expect(findings).toStrictEqual(["AGENTS.md:3 vite-plus-block"]);
});

layer(fixtureLayer)("commands run through Vite+", (it) => {
  it.effect(
    "flags package.json scripts that are not lifecycle scripts",
    () => flagsScriptsThatAreNotLifecycleScripts,
  );
  it.effect(
    "flags package managers in scripts, tasks, steps, hooks and MCP commands",
    () => flagsPackageManagersInEveryCommandSurface,
  );
  it.effect(
    "passes quoted text, Dockerfiles and prose that only name a package manager",
    () => passesCommandsThatOnlyNameAPackageManager,
  );
  it.effect(
    "flags flags that skip a gate and tasks that wrap --filter",
    () => flagsSkippedGatesAndFilterTasks,
  );
  it.effect("flags the Vite+ block in agent docs", () => flagsTheVitePlusBlockInAgentDocs);
});
