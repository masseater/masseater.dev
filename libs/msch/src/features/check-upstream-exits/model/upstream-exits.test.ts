import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkScatteredDeviations } from "./scattered-deviations.ts";
import { checkUpstreamExits } from "./upstream-exits.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const exits = yield* checkUpstreamExits(root);
  const scattered = yield* checkScatteredDeviations(root);
  return pipe(
    sortProblems([...exits, ...scattered]),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const WORKSPACE = Arr.join(
  [
    "packages:",
    "  - apps/*",
    "# exit: unused",
    "overrides:",
    '  "langium>vscode-languageserver": "catalog:" # exit: npm:langium allows vscode-languageserver@>=11',
    "  zod@<4.6.6: ^4.6.6 # exit: unused",
    "  workerd: 1.20261115.1",
    "  capnp-es>typescript: '-' # exit: when capnp-es is fixed",
    "packageExtensions:",
    "  safer-buffer@2.1.2: # exit: unused",
    "    dependencies:",
    "      buffer: ^6.0.3",
    "patchedDependencies:",
    "  '@tanstack/intent@0.5.6': patches/intent.patch # exit: npm:@tanstack/intent@>0.5.6",
    "",
  ],
  "\n",
);

const CARGO = Arr.join(
  [
    "[workspace]",
    'members = ["crates/*"]',
    "[patch.crates-io]",
    'proc-macro-crate = { path = "patches/proc-macro-crate" } # exit: crate:tao requires gtk@>=0.19',
    'syn = { path = "patches/syn" }',
    "",
  ],
  "\n",
);

const flagsMissingAndInvalidExits = Effect.gen(function* flagsMissingAndInvalidExits() {
  const findings = yield* findingsFor({ "pnpm-workspace.yaml": WORKSPACE, "Cargo.toml": CARGO });
  expect(findings).toStrictEqual([
    "Cargo.toml:5 upstream-exit",
    "pnpm-workspace.yaml:3 upstream-exit",
    "pnpm-workspace.yaml:7 upstream-exit",
    "pnpm-workspace.yaml:8 upstream-exit",
    "pnpm-workspace.yaml:10 upstream-exit",
  ]);
});

const flagsDeviationsOutsideTheRoot = Effect.gen(function* flagsDeviationsOutsideTheRoot() {
  const findings = yield* findingsFor({
    "package.json":
      '{\n  "name": "root",\n  "pnpm": {\n    "overrides": { "zod": "4.6.6" }\n  }\n}\n',
    "apps/web/package.json": '{\n  "name": "web",\n  "resolutions": { "zod": "4.6.6" }\n}\n',
    "apps/web/pnpm-workspace.yaml": "overrides:\n  zod: 4.6.6 # exit: unused\n",
    "crates/core/Cargo.toml":
      '[package]\nname = "core"\n\n[patch.crates-io]\nsyn = { path = "x" }\n',
    "libs/kit/package.json": '{ "name": "kit", "dependencies": { "zod": "4.6.6" } }\n',
  });
  expect(findings).toStrictEqual([
    "apps/web/package.json:3 upstream-deviation-place",
    "apps/web/pnpm-workspace.yaml:2 upstream-deviation-place",
    "crates/core/Cargo.toml:5 upstream-deviation-place",
    "package.json:4 upstream-deviation-place",
  ]);
});

layer(fixtureLayer)("checkUpstreamExits", (it) => {
  it.effect(
    "flags deviations without a checkable exit condition",
    () => flagsMissingAndInvalidExits,
  );
  it.effect("flags deviations written outside the root files", () => flagsDeviationsOutsideTheRoot);
});
