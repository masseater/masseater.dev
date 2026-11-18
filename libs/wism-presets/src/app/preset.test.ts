import { NodeServices } from "@effect/platform-node";
import { lint } from "@r_masseater/wism";
import type { Diagnostic, WismConfig, WismError } from "@r_masseater/wism";
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

import { rustCrate, skill, workspace } from "#/entities/kind/index.ts";

import { structure } from "./preset.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const MODULE = "export const value = 1;\n";
const PRESET: WismConfig = structure({
  kinds: [workspace({ paths: ["libs/*"] }), rustCrate(), skill()],
});

const lintTree = (
  tree: Readonly<Record<string, string>>,
  config: WismConfig = PRESET,
): Effect.Effect<
  readonly Diagnostic[],
  WismError | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* fixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    yield* Effect.forEach(
      Rec.toEntries(tree),
      ([name, text]) =>
        Effect.gen(function* write() {
          const file = path.join(root, name);
          yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
          yield* fileSystem.writeFileString(file, text);
        }),
      { concurrency: 1 },
    );
    const files = pipe(
      Rec.keys(tree),
      Arr.filter((name) => !Str.includes("node_modules/")(name)),
    );
    return yield* lint({ root, files, config });
  }).pipe(Effect.scoped);

const found = (diagnostics: readonly Diagnostic[]): readonly string[] =>
  pipe(
    diagnostics,
    Arr.map(({ rule, path, line }) => `${rule} ${path}:${String(line)}`),
  );

test("accepts a layered workspace, crate and skill", () =>
  Effect.gen(function* accepts() {
    const diagnostics = yield* lintTree({
      "libs/kit/package.json": `{ "name": "kit" }`,
      "libs/kit/vite.config.ts": MODULE,
      "libs/kit/bin/kit.ts": `import { run } from "../src/app/index.ts";\nrun();\n`,
      "libs/kit/src/app/index.ts": `export { run } from "#/features/run-kit/index.ts";\n`,
      "libs/kit/src/features/run-kit/index.ts": `export { run } from "./model/run.ts";\n`,
      "libs/kit/src/features/run-kit/model/run.ts": `import { job } from "../../../entities/job/index.ts";\nexport const run = () => job;\n`,
      "libs/kit/src/entities/job/index.ts": `export const job = 1;\n`,
      "libs/kit/src/shared/lib/text.ts": MODULE,
      "libs/kit/README.md": "[run](./src/app/index.ts)\n",
      "libs/core/Cargo.toml": `[package]\nname = "core"\n`,
      "libs/core/src/lib.rs": "mod features;\nmod entities;\n",
      "libs/core/src/features/mod.rs": "pub mod sync_notes;\n",
      "libs/core/src/features/sync_notes/mod.rs": "use crate::entities::note::Note;\n",
      "libs/core/src/entities/mod.rs": "pub mod note;\n",
      "libs/core/src/entities/note.rs": "pub struct Note;\n",
      "skills/write/SKILL.md": "# write\n\n[style](references/style.md)\n",
      "skills/write/references/style.md": "# style\n",
    });
    expect(found(diagnostics)).toStrictEqual([]);
  }).pipe(services.runPromise));

test("reports files outside the layout and imports against the layers", () =>
  Effect.gen(function* reports() {
    const diagnostics = yield* lintTree({
      "libs/kit/package.json": `{ "name": "kit" }`,
      "libs/kit/kit.ts": MODULE,
      "libs/kit/src/index.ts": MODULE,
      "libs/kit/src/utils/a.ts": MODULE,
      "libs/kit/src/entities/job/index.ts": `import { run } from "../../features/run-kit/index.ts";\nexport const job = run;\n`,
      "libs/kit/src/features/run-kit/index.ts": `export * from "./model/run.ts";\n`,
      "libs/kit/src/features/run-kit/model/run.ts": `export { read as run } from "../../read-kit/model/read.ts";\n`,
      "libs/kit/src/features/read-kit/index.ts": MODULE,
      "libs/kit/src/features/read-kit/model/read.ts": `export const read = 1;\n`,
      "libs/kit/README.md": "[gone](./docs/gone.md)\n",
      "libs/core/Cargo.toml": `[package]\nname = "core"\n`,
      "libs/core/src/lib.rs": "mod entities;\n",
      "libs/core/src/entities/note.rs": "pub fn note() { log!(crate::features::sync::go()); }\n",
      "skills/write/SKILL.md": "# write\n",
      "skills/write/notes.txt": "x\n",
    });
    expect(found(diagnostics)).toStrictEqual([
      "structure/layer-import libs/core/src/entities/note.rs:1",
      "structure/link-target libs/kit/README.md:1",
      "structure/placement libs/kit/kit.ts:1",
      "structure/layer-import libs/kit/src/entities/job/index.ts:1",
      "structure/wildcard-export libs/kit/src/features/run-kit/index.ts:1",
      "structure/cross-slice libs/kit/src/features/run-kit/model/run.ts:1",
      "structure/loose-file libs/kit/src/index.ts:1",
      "structure/layer-name libs/kit/src/utils:1",
      "structure/placement skills/write/notes.txt:1",
    ]);
  }).pipe(services.runPromise));

test("follows what the presets allow and forbid", () =>
  Effect.gen(function* presets() {
    const diagnostics = yield* lintTree({
      "libs/kit/package.json": `{ "name": "kit", "imports": { "#/*": "./src/*" } }`,
      "libs/kit/alchemy.run.ts": MODULE,
      "libs/kit/env.d.ts": MODULE,
      "libs/kit/scripts/build.ts": MODULE,
      "libs/kit/src/app/index.ts": `import { login } from "#/features/auth/login/index.js";\nimport pkg from "pkg";\nimport fs from "node:fs";\nexport const app = [login, pkg, fs];\n`,
      "libs/kit/src/features/auth/login/index.ts": `export { login } from "./model/login.ts";\n`,
      "libs/kit/src/features/auth/login/model/login.ts": `import { button } from "../../../../shared/ui/button.ts";\nimport { types } from "../../../../shared/config/types.ts";\nexport const login = [button, types];\n`,
      "libs/kit/src/entities/user/index.ts": `import { job } from "../job/@x/user.ts";\nexport const user = job;\n`,
      "libs/kit/src/entities/job/index.ts": MODULE,
      "libs/kit/src/entities/job/@x/user.ts": `export const job = 1;\n`,
      "libs/kit/src/shared/ui/button.ts": `export const button = 1;\n`,
      "libs/kit/src/shared/config/index.ts": MODULE,
      "libs/kit/src/shared/config/types.ts": `export const types = 1;\n`,
      "libs/kit/node_modules/pkg/package.json": `{ "name": "pkg", "main": "index.js" }`,
      "libs/kit/node_modules/pkg/index.js": MODULE,
      "libs/core/Cargo.toml": `[package]\nname = "core"\n`,
      "libs/core/src/main.rs": "fn main() {}\n",
      "libs/core/tests/run.rs": "#[test]\nfn run() {}\n",
      "libs/core/benches/speed.rs": "fn main() {}\n",
      "libs/core/examples/demo.rs": "fn main() {}\n",
      "skills/write/SKILL.md": "# write\n",
      "skills/write/usecases/draft.md": "# draft\n",
      "skills/write/scripts/check.ts": MODULE,
      "skills/write/assets/logo.svg": "<svg/>\n",
    });
    expect(found(diagnostics)).toStrictEqual([
      "structure/placement libs/core/examples/demo.rs:1",
      "structure/placement libs/kit/scripts/build.ts:1",
      "structure/public-api libs/kit/src/features/auth/login/model/login.ts:2",
    ]);
  }).pipe(services.runPromise));

test("follows the severities set over the preset and keeps its ignores", () =>
  Effect.gen(function* severities() {
    const tree = {
      "libs/kit/package.json": `{ "name": "kit" }`,
      "libs/kit/kit.ts": MODULE,
      "libs/kit/src/index.ts": MODULE,
    };
    const diagnostics = yield* lintTree(tree, {
      ...PRESET,
      rules: { ...PRESET.rules, "structure/placement": "warn", "structure/loose-file": "off" },
    });
    expect(
      pipe(
        diagnostics,
        Arr.map(({ rule, severity }) => `${severity} ${rule}`),
      ),
    ).toStrictEqual(["warn structure/placement"]);
    expect(structure({ kinds: [], ignores: ["libs/kit/kit.ts"] }).ignores).toStrictEqual([
      "libs/kit/kit.ts",
    ]);
  }).pipe(services.runPromise));

test("turns on only the rules of the chosen presets", () =>
  Effect.gen(function* chosen() {
    const kinds = [workspace({ paths: ["libs/*"] })];
    const diagnostics = yield* lintTree(
      {
        "libs/kit/package.json": `{ "name": "kit" }`,
        "libs/kit/kit.ts": MODULE,
        "libs/kit/src/index.ts": MODULE,
        "libs/kit/README.md": "[gone](./gone.md)\n",
      },
      structure({ kinds, presets: ["placement", "links"] }),
    );
    expect(found(diagnostics)).toStrictEqual([
      "structure/link-target libs/kit/README.md:1",
      "structure/placement libs/kit/kit.ts:1",
    ]);
    expect(structure({ kinds, presets: [] }).rules).toStrictEqual({});
  }).pipe(services.runPromise));
