import { NodeServices } from "@effect/platform-node";
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

import { docsPreset, lint } from "./index.ts";
import type { Diagnostic, Y8Error } from "./index.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const lintRepository = (
  files: Readonly<Record<string, string>>,
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
      config: docsPreset({
        agents: {
          sections: [["Tech stack"], ["Commands"], ["Rules"]],
          commands: ["Commands"],
          stack: ["Tech stack"],
        },
        skills: { purpose: ["Purpose"], skillNames: { index: "index" } },
      }),
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

test("each file kind gets its own rules", () =>
  Effect.gen(function* failing() {
    const diagnostics = yield* lintRepository({
      "package.json": PACKAGE,
      "README.md":
        "# demo\n\nOne. Two. Three.\n\n## Features\n\n[guide](docs/guide.md)\n\n[missing](nothing.md)\n",
      "docs/guide.md": "# Guide\n",
      "AGENTS.md": "Plain text with no title.\n\n## Testing\n\nRun tests.\n",
      "pkg/AGENTS.md":
        "# pkg\n\nThe pkg workspace.\n\n## Notes\n\nUse the `other-skill` skill.\n\nテストを書く。\n",
      "skills/demo/SKILL.md":
        "---\nname: Demo\ndescription: I help you.\n---\n\n# demo\n\n## When to use\n\nAlways.\n",
      "skills/other-skill/SKILL.md":
        "---\nname: other-skill\ndescription: Another skill.\n---\n\n# other-skill\n\n## Purpose\n\nAnother.\n",
    });
    expect(errorsOf(diagnostics)).toStrictEqual([
      "AGENTS.md markdownlint/MD041",
      "AGENTS.md docs/agents-title",
      "AGENTS.md docs/agents-sections",
      "AGENTS.md docs/agents-skill-owned",
      "README.md docs/readme-title",
      "README.md docs/readme-summary",
      "README.md docs/readme-usage",
      "README.md docs/readme-agent-skills",
      "README.md docs/readme-no-feature-list",
      "README.md docs/readme-no-unshipped-links",
      "README.md docs/link-target-exists",
      "pkg/AGENTS.md docs/agents-workspace-shape",
      "pkg/AGENTS.md docs/agents-no-skill-names",
      "pkg/AGENTS.md docs/agents-english",
      "skills/demo/SKILL.md docs/skill-title",
      "skills/demo/SKILL.md docs/skill-purpose-first",
      "skills/demo/SKILL.md docs/skill-description-person",
      "skills/demo/SKILL.md agnix/AS-004",
      "skills/demo/SKILL.md agnix/AS-017",
      "skills/demo/SKILL.md docs/skill-no-when-section",
    ]);
  }).pipe(services.runPromise));
