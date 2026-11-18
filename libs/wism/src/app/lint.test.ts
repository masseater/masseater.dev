import { layer as nodeServices } from "@effect/platform-node/NodeServices";
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
import { constVoid } from "effect/Function";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import { definePlugin, defineRule, lint } from "./index.ts";
import type { Diagnostic, GraphEdge, RuleContext, WismConfig, WismError } from "./index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const MODULE = "export const value = 1;\n";
const NOTHING: WismConfig = {};

const lintTree = (
  tree: Readonly<Record<string, string>>,
  config: WismConfig = NOTHING,
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
        plugins: { local: definePlugin({ rules: { "no-job": noJob, quiet: noJob } }) },
        rules: { "local/no-job": "warn", "local/quiet": "off" },
      },
    );
    expect(
      pipe(
        diagnostics,
        Arr.map(({ rule, severity }) => `${severity} ${rule}`),
      ),
    ).toStrictEqual(["warn local/no-job"]);
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

const keeping = (keep: (context: RuleContext) => void): WismConfig => ({
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

test("hands plugin rules the root, files and edges", () =>
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
        Arr.flatMap(({ edges }) => edges),
      ),
    ).toStrictEqual(GRAPH_EDGES);
  }).pipe(services.runPromise));

test("fails when rules name a plugin that is not configured", () =>
  Effect.gen(function* unknown() {
    const failure = yield* Effect.flip(
      lintTree({ "libs/kit/package.json": "{}" }, { rules: { "gone/rule": "error" } }),
    );
    expect(failure.message).toContain("gone");
  }).pipe(services.runPromise));

test("finds nothing without rules or files", () =>
  Effect.gen(function* empty() {
    const withoutRules = yield* lintTree({ "libs/kit/kit.ts": MODULE });
    const withoutFiles = yield* lintTree({}, keeping(constVoid));
    expect([withoutRules, withoutFiles]).toStrictEqual([[], []]);
  }).pipe(services.runPromise));
