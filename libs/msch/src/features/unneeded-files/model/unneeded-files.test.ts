import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkUnneededFiles } from "./unneeded-files.ts";

const INSTALLER = "rustup";
const FETCHER = "cargo";
const SETUP_ACTION = "dtolnay/rust-toolchain@stable";
const PNPM_CARGO = "packages:\n  - tools/*\ncargo:\n  enabled: true\n";
const PNPM_ONLY = "packages:\n  - tools/*\n";
const ROOT_MANIFEST = '[workspace]\nmembers = ["tools/mosaic"]\n';
const PNPM_BLOCK = [
  "# >>> pnpm-managed cargo sources >>>",
  "[[include]]",
  'path = "../.pnpm/crates/config.toml"',
  "optional = true",
  "# <<< pnpm-managed cargo sources <<<",
  "",
];
const MEMBER_MANIFEST = '[package]\nname = "mosaic"\n';

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkUnneededFiles(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsFilesPnpmReplaces = Effect.gen(function* flagsFilesPnpmReplaces() {
  const findings = yield* findingsFor({
    "pnpm-workspace.yaml": PNPM_CARGO,
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "package-lock.json": "{}\n",
    "tools/site/yarn.lock": "\n",
    "tools/site/bun.lock": "{}\n",
    "Cargo.toml": ROOT_MANIFEST,
    "Cargo.lock": "version = 4\n",
    "tools/mosaic/Cargo.toml": MEMBER_MANIFEST,
    "tools/mosaic/Cargo.lock": "version = 4\n",
    ".cargo/config": "[build]\n",
    ".cargo/config.toml": Arr.join(PNPM_BLOCK, "\n"),
    "tools/mosaic/.cargo/config.toml": Arr.join(["[build]", "jobs = 2", ...PNPM_BLOCK], "\n"),
    ".pnpm/crates/config.toml": "\n",
    ".pnpm/crates/crates-io/serde/Cargo.toml": "\n",
  });
  expect(findings).toStrictEqual([
    ".cargo/config:1 unneeded-file",
    ".cargo/config.toml:1 unneeded-file",
    ".pnpm/crates/config.toml:1 unneeded-file",
    "package-lock.json:1 unneeded-file",
    "tools/mosaic/Cargo.lock:1 unneeded-file",
    "tools/site/bun.lock:1 unneeded-file",
    "tools/site/yarn.lock:1 unneeded-file",
  ]);
});

const flagsToolchainSetup = Effect.gen(function* flagsToolchainSetup() {
  const findings = yield* findingsFor({
    "pnpm-workspace.yaml": PNPM_CARGO,
    "Cargo.toml": ROOT_MANIFEST,
    ".github/workflows/verify.yml": pipe(
      [
        "jobs:",
        "  build:",
        "    steps:",
        `      - uses: ${SETUP_ACTION}`,
        `      - run: ${INSTALLER} toolchain install`,
        `      - run: ${INSTALLER} target add x86_64-apple-darwin`,
        `      - run: ${FETCHER} fetch --locked`,
        "",
      ],
      Arr.join("\n"),
    ),
    ".claude/hooks/session-start.sh": `${INSTALLER} toolchain install >&2\n`,
    "mise.toml": '[tools]\nnode = "26"\nrust = "1.100"\n"cargo:fallow-cli" = "1"\n',
  });
  expect(findings).toStrictEqual([
    ".claude/hooks/session-start.sh:1 unneeded-setup",
    ".github/workflows/verify.yml:4 unneeded-setup",
    ".github/workflows/verify.yml:5 unneeded-setup",
    ".github/workflows/verify.yml:6 unneeded-setup",
    ".github/workflows/verify.yml:7 unneeded-setup",
    "mise.toml:3 unneeded-setup",
  ]);
});

const flagsCratesOutsidePnpm = Effect.gen(function* flagsCratesOutsidePnpm() {
  const findings = yield* findingsFor({
    "pnpm-workspace.yaml": PNPM_ONLY,
    "Cargo.toml": ROOT_MANIFEST,
    "tools/mosaic/Cargo.toml": MEMBER_MANIFEST,
    "tools/mosaic/Cargo.lock": "version = 4\n",
    ".github/workflows/verify.yml": `      - run: ${INSTALLER} toolchain install\n`,
  });
  expect(findings).toStrictEqual(["Cargo.toml:1 cargo-outside-pnpm"]);
});

const keepsLockfilesOfNestedWorkspaces = Effect.gen(function* keepsLockfilesOfNestedWorkspaces() {
  const findings = yield* findingsFor({
    "pnpm-workspace.yaml": PNPM_CARGO,
    "libs/env/package.json": "{}\n",
    "libs/env/daemon/Cargo.toml": MEMBER_MANIFEST,
    "libs/env/daemon/Cargo.lock": "version = 4\n",
    "libs/env/daemon/.pnpm/crates/config.toml": "\n",
    "libs/env/daemon/.pnpm/rust/bin/cargo": "\n",
    "tools/notes/Cargo.lock": "version = 4\n",
  });
  expect(findings).toStrictEqual([
    "libs/env/daemon/.pnpm/crates/config.toml:1 unneeded-file",
    "tools/notes/Cargo.lock:1 unneeded-file",
  ]);
});

const passesRepositoriesWithoutPnpmOrCargo = Effect.gen(
  function* passesRepositoriesWithoutPnpmOrCargo() {
    const withoutPnpm = yield* findingsFor({
      "package-lock.json": "{}\n",
      "Cargo.toml": ROOT_MANIFEST,
    });
    const withoutCargo = yield* findingsFor({
      "pnpm-workspace.yaml": PNPM_ONLY,
      "docs/setup.md": `${INSTALLER} toolchain install で入れる。\n`,
      "scripts/setup.sh": `${INSTALLER} toolchain install\n`,
    });
    expect([...withoutPnpm, ...withoutCargo]).toStrictEqual([]);
  },
);

layer(fixtureLayer)("files pnpm makes unneeded", (it) => {
  it.effect(
    "flags other lockfiles, member Cargo.lock files, .cargo/config, a pnpm-only .cargo/config.toml and .pnpm",
    () => flagsFilesPnpmReplaces,
  );
  it.effect(
    "flags toolchain installs, crate fetches and mise Rust tools once pnpm manages Cargo",
    () => flagsToolchainSetup,
  );
  it.effect(
    "keeps the Cargo.lock of a Cargo workspace below the root and flags its .pnpm once",
    () => keepsLockfilesOfNestedWorkspaces,
  );
  it.effect("flags crates in a pnpm workspace without cargo.enabled", () => flagsCratesOutsidePnpm);
  it.effect(
    "passes repositories without a pnpm workspace or without crates",
    () => passesRepositoriesWithoutPnpmOrCargo,
  );
});
