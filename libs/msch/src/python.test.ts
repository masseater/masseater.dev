import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "./problem.ts";
import { checkPython } from "./python.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "./repository.test.support.ts";

const INTERPRETER = "python3";
const MANAGER = "uv";
const RUNNER = "uvx";
const INSTALLER = "pip";
const SETUP_ACTIONS = ["actions/setup-python@v6", "astral-sh/setup-uv@v10"] as const;

const SETUP_STEPS = pipe(
  SETUP_ACTIONS,
  Arr.map((action) => `      - uses: ${action}`),
);

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkPython(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsPythonFiles = Effect.gen(function* flagsPythonFiles() {
  const findings = yield* findingsFor({
    "tools/plot/main.py": "print(1)\n",
    "tools/plot/pyproject.toml": "[project]\n",
    "tools/plot/uv.lock": "version = 1\n",
    "tools/plot/requirements-dev.txt": "numpy\n",
    "notes/analysis.ipynb": "{}\n",
    ".python-version": "3.15\n",
    "src/copy.ts": "export const answer = 42;\n",
  });
  expect(findings).toStrictEqual([
    ".python-version:1 python-file",
    "notes/analysis.ipynb:1 python-file",
    "tools/plot/main.py:1 python-file",
    "tools/plot/pyproject.toml:1 python-file",
    "tools/plot/requirements-dev.txt:1 python-file",
    "tools/plot/uv.lock:1 python-file",
  ]);
});

const flagsCommandsInWorkflowsAndScripts = Effect.gen(
  function* flagsCommandsInWorkflowsAndScripts() {
    const findings = yield* findingsFor({
      ".github/workflows/verify.yml": pipe(
        [
          "jobs:",
          "  verify:",
          "    steps:",
          ...SETUP_STEPS,
          `      - run: ${MANAGER} run mosaic songs`,
          `      - run: ${INSTALLER} install numpy`,
          "",
        ],
        Arr.join("\n"),
      ),
      ".vite-hooks/pre-commit": `${INTERPRETER} "$script" --strict\n`,
      "scripts/build.sh": `${INTERPRETER} -m venv .venv\n${RUNNER} zizmor .\n`,
      "vite.config.ts": `export const task = "${MANAGER} run --project prepare prepare.ts";\n`,
    });
    expect(findings).toStrictEqual([
      ".github/workflows/verify.yml:4 python-command",
      ".github/workflows/verify.yml:5 python-command",
      ".github/workflows/verify.yml:6 python-command",
      ".github/workflows/verify.yml:7 python-command",
      ".vite-hooks/pre-commit:1 python-command",
      "scripts/build.sh:1 python-command",
      "scripts/build.sh:2 python-command",
      "vite.config.ts:1 python-command",
    ]);
  },
);

const flagsSpawnedCommandsAndTools = Effect.gen(function* flagsSpawnedCommandsAndTools() {
  const findings = yield* findingsFor({
    "src/read.ts": `ChildProcess.make(\n  "${MANAGER}",\n  ["run", "-q"],\n);\n`,
    "src/main.rs": `let mut command = Command::new("${MANAGER}");\n`,
    ".mcp.json": `{ "mcpServers": { "serena": { "command": "${RUNNER}" } } }\n`,
    ".codex/config.toml": `[mcp_servers.serena]\ncommand = "${RUNNER}"\n`,
    "mise.toml": `[tools]\nnode = "26"\n${MANAGER} = "latest"\n"pipx:zizmor" = "1"\n`,
  });
  expect(findings).toStrictEqual([
    ".codex/config.toml:2 python-command",
    ".mcp.json:1 python-command",
    "mise.toml:3 python-command",
    "mise.toml:4 python-command",
    "src/main.rs:1 python-command",
    "src/read.ts:1 python-command",
  ]);
});

const passesCodeThatOnlyNamesPython = Effect.gen(function* passesCodeThatOnlyNamesPython() {
  const findings = yield* findingsFor({
    "src/languages.ts":
      'export const LANGUAGES = ["python", "go"];\nexport const NAME = "python";\n',
    "src/shader.ts": 'export const SHADER = "vec2 p = (uv - 0.5) / 1.6; result.uv = corner;";\n',
    "src/mesh.ts": 'geometry.setAttribute("uv", attribute);\n',
    "docs/uv.md": `${MANAGER} run は命令を動かす。${INSTALLER} install と同じ形である。\n`,
    "pnpm-lock.yaml": `packages:\n  ${MANAGER} run: {}\n`,
    "mise.toml": '[tools]\nnode = "26"\nrust = "1.95"\n',
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("Python is not used", (it) => {
  it.effect("flags Python sources, manifests and lockfiles", () => flagsPythonFiles);
  it.effect(
    "flags Python commands and setup actions in workflows, hooks, scripts and tasks",
    () => flagsCommandsInWorkflowsAndScripts,
  );
  it.effect(
    "flags spawned Python commands, MCP commands and mise tools",
    () => flagsSpawnedCommandsAndTools,
  );
  it.effect("passes code and prose that only name Python", () => passesCodeThatOnlyNamesPython);
});
