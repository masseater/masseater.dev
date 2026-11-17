import {
  Effect,
  Function as Fn,
  Layer,
  Predicate,
  Ref,
  Sink,
  Stdio,
  Array as Arr,
  String as Str,
  pipe,
} from "effect";
import type { Exit, Scope } from "effect";

import { VendorDirectory } from "#/entities/binary/index.test.support.ts";
import type { CommandError, CommandServices } from "#/shared/lib/command.ts";
import { commitEmpty, directoryWith, lines, runGit } from "#/shared/lib/fixture.test.support.ts";
import { toJson } from "#/shared/lib/json.ts";

import { runVpa } from "./vpa.ts";

/** @internal */
export interface Captured {
  readonly exit: Exit.Exit<void, CommandError>;
  readonly output: string;
}

const CONFIG = lines(
  "export default {",
  '  commitlint: { rules: { "type-empty": [2, "never"] } },',
  '  dependencyRules: { banned: { "use the stack": ["left-pad"] } },',
  '  h56m: { extend: { useDefault: true }, ignoredSecrets: ["0".repeat(64)] },',
  "  steiger: {",
  '    paths: ["src"],',
  "    rules: [",
  '      { meta: { name: "none", version: "0.0.0" }, ruleDefinitions: [{ name: "none/ok", check: () => ({ diagnostics: [] }) }] },',
  '      { rules: { "none/ok": "error" } },',
  "    ],",
  "  },",
  '  textlint: { ignores: ["skip/**"], rules: {} },',
  "};",
);

/** @internal */
export const manifest = (dependencies: Readonly<Record<string, string>>): string =>
  toJson({ name: "fixture", dependencies });

const REPOSITORY = {
  "vite.config.ts": CONFIG,
  "package.json": manifest({}),
  "pnpm-workspace.yaml": lines("packages:", "  - libs/*"),
  "libs/a/package.json": manifest({ effect: "4.1.2" }),
  "docs/guide.md": "# Guide\n",
  "skip/notes.md": "#Notes\n",
  "src/shared/index.ts": "export {};\n",
};

const ORIGIN_MAIN: readonly (readonly string[])[] = [
  ["update-ref", "refs/remotes/origin/main", "HEAD"],
];

/** @internal */
export interface History {
  readonly files?: Readonly<Record<string, string>>;
  readonly commits?: readonly string[];
  readonly base?: string;
  readonly remoteRefs?: readonly (readonly string[])[];
}

/** @internal */
export const repositoryWith = ({
  files = {},
  commits = [],
  base = "feat: base",
  remoteRefs = ORIGIN_MAIN,
}: History = {}): Effect.Effect<string, never, CommandServices | Scope.Scope> =>
  Effect.gen(function* repository() {
    const root = yield* directoryWith({ ...REPOSITORY, ...files });
    yield* commitEmpty(root, base);
    yield* Effect.forEach(remoteRefs, (args) => runGit(root, args), { concurrency: 1 });
    yield* Effect.forEach(commits, (message) => commitEmpty(root, message), { concurrency: 1 });
    return root;
  });

const DATA_FIRST_ARITY = 2;

/** @internal */
export const run: {
  (args: readonly string[]): (root: string) => Effect.Effect<Captured, never, CommandServices>;
  (root: string, args: readonly string[]): Effect.Effect<Captured, never, CommandServices>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (root: string, args: readonly string[]): Effect.Effect<Captured, never, CommandServices> =>
    Effect.gen(function* capture() {
      const written = yield* Ref.make<readonly (string | Uint8Array)[]>([]);
      const stdout = Sink.collect<string | Uint8Array>().pipe(
        Sink.mapEffect((chunks) => Ref.set(written, chunks)),
      );
      const stdio = Stdio.layerTest({ stdout: () => stdout });
      const context = yield* Layer.build(stdio);
      const exit = yield* Effect.exit(
        runVpa(root, args).pipe(
          Effect.provideContext(context),
          Effect.provideService(VendorDirectory, `${root}/vendor`),
        ),
      );
      const chunks = yield* Ref.get(written);
      return { exit, output: pipe(chunks, Arr.filter(Predicate.isString), Arr.join("")) };
    }).pipe(Effect.scoped),
);

/** @internal */
export const statusLines = (output: string): readonly string[] =>
  pipe(
    Str.split(output, "\n"),
    Arr.filter((line) => Str.startsWith("✓ ")(line) || Str.startsWith("✗ ")(line)),
  );

/** @internal */
export const failedChecksOf = (output: string): readonly string[] =>
  pipe(statusLines(output), Arr.filter(Str.startsWith("✗ ")));
