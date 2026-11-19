import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lint } from "@r_masseater/y8";
import type { Diagnostic, Y8Config, Y8Error } from "@r_masseater/y8";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import { readme, recommended } from "./index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const RECOMMENDED: Y8Config = recommended({
  agents: {
    sections: [["Tech stack"], ["Commands"], ["Rules"]],
    commands: ["Commands"],
    stack: ["Tech stack"],
  },
  skills: { purpose: ["Purpose"], skillNames: { index: "index" } },
});

const lintRepository = (
  files: Readonly<Record<string, string>>,
  config: Y8Config = RECOMMENDED,
): Effect.Effect<
  readonly Diagnostic[],
  Y8Error | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* fixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    for (const [name, text] of Rec.toEntries(files)) {
      yield* fileSystem.makeDirectory(path.dirname(path.join(root, name)), { recursive: true });
      yield* fileSystem.writeFileString(path.join(root, name), text);
    }
    const markdown = pipe(Rec.keys(files), Arr.filter(Str.endsWith(".md")));
    return yield* lint({
      root,
      files: markdown,
      projectFiles: Rec.keys(files),
      config,
    });
  }).pipe(Effect.scoped);

const errorsOf = (diagnostics: readonly Diagnostic[]): readonly string[] =>
  pipe(
    diagnostics,
    Arr.filter(({ severity }) => severity === "error"),
    Arr.map(({ path, rule }) => `${path} ${rule}`),
  );

const PACKAGE = `{ "name": "@scope/demo", "files": ["dist"] }`;
const README =
  "# @scope/demo\n\nDemo does one thing.\n\n```sh\nnpm i @scope/demo\n```\n\nThe package ships agent skills for coding agents.\n";
const ROOT_AGENTS =
  "# demo\n\nDemo repository.\n\n## Tech stack\n\nTypeScript.\n\n## Commands\n\n```sh\nvp check\n```\n\n## Rules\n\n- Keep it short.\n";
const SKILL =
  "---\nname: demo\ndescription: Demonstrates the preset.\n---\n\n# demo\n\n## Purpose\n\nShow the shape.\n";

test("documents that follow the preset pass", () =>
  Effect.gen(function* passing() {
    const diagnostics = yield* lintRepository({
      "package.json": PACKAGE,
      "README.md": README,
      "AGENTS.md": ROOT_AGENTS,
      "skills/demo/SKILL.md": SKILL,
      "dist/index.js": "",
    });
    expect(errorsOf(diagnostics)).toStrictEqual([]);
  }).pipe(services.runPromise));

const FAILING: Readonly<Record<string, string>> = {
  "package.json": PACKAGE,
  "README.md":
    "# demo\n\nOne. Two. Three.\n\n## Features\n\n[guide](docs/guide.md)\n\n[missing](nothing.md)\n",
  "docs/guide.md": "# Guide\n",
  "AGENTS.md": "Plain text with no title.\n\n## Testing\n\nRun tests.\n",
  "pkg/AGENTS.md":
    "# pkg\n\nThe pkg workspace.\n\n## Notes\n\nUse the `other-skill` skill. Edit `src/gone.ts`.\n\nテストを書く。\n",
  "pkg/src/index.ts": "",
  "skills/demo/SKILL.md":
    "---\nname: Demo\ndescription: I help you.\n---\n\n# demo\n\n## When to use\n\nAlways.\n",
  "skills/other-skill/SKILL.md":
    "---\nname: other-skill\ndescription: Another skill.\n---\n\n# other-skill\n\n## Purpose\n\nAnother.\n",
};

test("each file kind gets its own rules", () =>
  Effect.gen(function* failing() {
    const diagnostics = yield* lintRepository(FAILING);
    expect(errorsOf(diagnostics)).toStrictEqual([
      "AGENTS.md markdownlint/MD041",
      "AGENTS.md agents-md/title",
      "AGENTS.md agents-md/sections",
      "AGENTS.md agents-md/skill-owned",
      "README.md readme/summary",
      "README.md readme/usage",
      "README.md readme/agent-skills",
      "README.md readme/title",
      "README.md readme/no-feature-list",
      "README.md readme/no-unshipped-links",
      "README.md docs/link-target-exists",
      "pkg/AGENTS.md agents-md/workspace-shape",
      "pkg/AGENTS.md agents-md/no-skill-names",
      "pkg/AGENTS.md agents-md/code-paths-exist",
      "pkg/AGENTS.md agents-md/english",
      "skills/demo/SKILL.md skill-md/title",
      "skills/demo/SKILL.md skill-md/purpose-first",
      "skills/demo/SKILL.md skill-md/description-person",
      "skills/demo/SKILL.md agnix/AS-004",
      "skills/demo/SKILL.md agnix/AS-017",
      "skills/demo/SKILL.md skill-md/no-when-section",
    ]);
  }).pipe(services.runPromise));

test("a config that extends one preset gets only the rules of that concern", () =>
  Effect.gen(function* single() {
    const diagnostics = yield* lintRepository(FAILING, { extends: [readme()] });
    expect(
      pipe(
        errorsOf(diagnostics),
        Arr.filter((line) => !Str.includes("markdownlint/")(line)),
      ),
    ).toStrictEqual([
      "README.md readme/summary",
      "README.md readme/usage",
      "README.md readme/agent-skills",
      "README.md readme/title",
      "README.md readme/no-feature-list",
      "README.md readme/no-unshipped-links",
    ]);
  }).pipe(services.runPromise));
