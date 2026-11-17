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

import { definePlugin, defineRule, lint, rustCrate, skill, workspace } from "./index.ts";
import type {
  Diagnostic,
  GraphEdge,
  GraphNode,
  RuleContext,
  WismConfig,
  WismError,
} from "./index.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const MODULE = "export const value = 1;\n";
const KINDS = [workspace({ paths: ["libs/*"] }), rustCrate(), skill()];

const DEFAULT_CONFIG: WismConfig = { kinds: KINDS };

const lintTree = (
  tree: Readonly<Record<string, string>>,
  config: WismConfig = DEFAULT_CONFIG,
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
      "layer-import libs/core/src/entities/note.rs:1",
      "link-target libs/kit/README.md:1",
      "placement libs/kit/kit.ts:1",
      "layer-import libs/kit/src/entities/job/index.ts:1",
      "wildcard-export libs/kit/src/features/run-kit/index.ts:1",
      "cross-slice libs/kit/src/features/run-kit/model/run.ts:1",
      "loose-file libs/kit/src/index.ts:1",
      "layer-name libs/kit/src/utils:1",
      "placement skills/write/notes.txt:1",
    ]);
  }).pipe(services.runPromise));

test("runs plugin rules on the graph and follows rule severities", () =>
  Effect.gen(function* plugins() {
    const noJob = defineRule({
      meta: { description: "Nothing imports the job entity" },
      check: ({ edges, report }) => {
        for (const edge of edges) {
          if (Str.includes("job")(edge.specifier)) {
            report({ path: edge.from, line: edge.line, message: "imports job" });
          }
        }
      },
    });
    const diagnostics = yield* lintTree(
      {
        "libs/kit/package.json": `{ "name": "kit" }`,
        "libs/kit/kit.ts": MODULE,
        "libs/kit/src/app/index.ts": `import { job } from "../entities/job/index.ts";\nexport const app = job;\n`,
        "libs/kit/src/entities/job/index.ts": MODULE,
      },
      {
        kinds: KINDS,
        plugins: { local: definePlugin({ rules: { "no-job": noJob } }) },
        rules: { placement: "warn", "local/no-job": "error" },
      },
    );
    expect(
      pipe(
        diagnostics,
        Arr.map(({ rule, severity }) => `${severity} ${rule}`),
      ),
    ).toStrictEqual(["warn placement", "error local/no-job"]);
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
      "placement libs/core/examples/demo.rs:1",
      "placement libs/kit/scripts/build.ts:1",
      "public-api libs/kit/src/features/auth/login/model/login.ts:2",
    ]);
  }).pipe(services.runPromise));

const GRAPH_TREE: Readonly<Record<string, string>> = {
  "libs/kit/package.json": `{ "name": "kit" }`,
  "libs/kit/src/app/index.ts": `export * from "../entities/job/index.ts";\n`,
  "libs/kit/src/entities/job/index.ts": MODULE,
  "libs/core/Cargo.toml": `[package]\nname = "core"\n`,
  "libs/core/src/features/sync.rs": "use crate::entities::note::Note;\n",
};

const GRAPH_EDGES: readonly GraphEdge[] = [
  {
    from: "libs/kit/src/app/index.ts",
    specifier: "../entities/job/index.ts",
    target: { type: "file", value: "libs/kit/src/entities/job/index.ts" },
    line: 1,
    column: 15,
    wildcard: true,
  },
  {
    from: "libs/core/src/features/sync.rs",
    specifier: "crate::entities::note::Note",
    target: { type: "module", value: ["entities", "note", "Note"] },
    line: 1,
    column: 5,
    wildcard: false,
  },
];

const JOB_NODE: GraphNode = {
  path: "libs/kit/src/entities/job/index.ts",
  kind: "workspace",
  dir: "libs/kit",
  layer: "entities",
  slice: "job",
};

const keeping = (keep: (context: RuleContext) => void): WismConfig => ({
  kinds: KINDS,
  plugins: {
    local: definePlugin({
      rules: {
        see: defineRule({
          meta: { description: "Keeps the context" },
          check: keep,
        }),
      },
    }),
  },
  rules: { "local/see": ["warn", { depth: 1 }] },
});

test("hands plugin rules the files, nodes and edges", () =>
  Effect.gen(function* graph() {
    const seen: RuleContext[] = [];
    yield* lintTree(
      GRAPH_TREE,
      keeping((context) => {
        seen.push(context);
      }),
    );
    expect(
      pipe(
        seen,
        Arr.map(({ files, options }) => ({ files: files.length, options })),
      ),
    ).toStrictEqual([{ files: Rec.size(GRAPH_TREE), options: { depth: 1 } }]);
    expect(
      pipe(
        seen,
        Arr.flatMap(({ nodes }) => nodes),
      ),
    ).toContainEqual(JOB_NODE);
    expect(
      pipe(
        seen,
        Arr.flatMap(({ edges }) => edges),
      ),
    ).toStrictEqual(GRAPH_EDGES);
  }).pipe(services.runPromise));

test("fails when rules name a plugin that is not configured", () =>
  Effect.gen(function* unknown() {
    const failure = yield* Effect.flip(
      lintTree(
        { "libs/kit/package.json": "{}" },
        { kinds: KINDS, rules: { "gone/rule": "error" } },
      ),
    );
    expect(failure.message).toContain("gone");
  }).pipe(services.runPromise));

test("finds nothing without kinds or files", () =>
  Effect.gen(function* empty() {
    const withoutKinds = yield* lintTree({ "libs/kit/kit.ts": MODULE }, {});
    const withoutFiles = yield* lintTree({});
    expect([withoutKinds, withoutFiles]).toStrictEqual([[], []]);
  }).pipe(services.runPromise));
