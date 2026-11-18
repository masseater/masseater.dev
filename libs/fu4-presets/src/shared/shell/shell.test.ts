import { NodeServices } from "@effect/platform-node";
import { defineRule, lintText } from "@r_masseater/fu4";
import type { Fu4Config } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { CODES, checkShell, messageOf } from "./index.ts";
import type { Finding } from "./index.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const CORPUS = "fixtures/shellcheck";
const SCRIPT = /\.in$/u;
const MINIMUM_SCRIPTS = 300;
const SEQUENTIAL = { concurrency: 1 } as const;
const IMPLEMENTED = new Set(
  pipe(
    Rec.values(CODES),
    Arr.map((code) => `SC${String(code.number)}`),
  ),
);

const rendered = (finding: Finding): string => {
  const code = CODES[finding.code];
  return `SC${String(code.number)}:${code.level}:${String(finding.line)}:${String(finding.column)}: ${messageOf(finding)}`;
};

const scriptIn = (settings: Readonly<Record<string, unknown>>): string =>
  pipe(
    Rec.get(settings, "script"),
    Option.filter(Str.isString),
    Option.getOrElse(() => ""),
  );

const probe = defineRule({
  meta: { description: "Runs the shell checker on the script in the settings" },
  check: (context) => {
    const parsed = context.parseScript("bash", scriptIn(context.settings));
    for (const finding of checkShell(parsed)) {
      context.report({ line: 1, column: 1, message: rendered(finding) });
    }
  },
});

const configOf = (script: string): Fu4Config => ({
  plugins: { probe: { rules: { probe } } },
  rules: { "probe/probe": "error" },
  settings: { script },
});

const sortedLines = (lines: readonly string[]): readonly string[] => Arr.sort(lines, Str.Order);

const isImplemented = (line: string): boolean =>
  pipe(
    Arr.head(Str.split(":")(line)),
    Option.exists((code) => IMPLEMENTED.has(code)),
  );

const recorded = (text: string): readonly string[] =>
  sortedLines(pipe(Str.split("\n")(text), Arr.filter(isImplemented)));

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const compare = Effect.fn("compare")(function* compare(dir: string, name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const script = yield* fileSystem.readFileString(path.join(dir, name));
  const out = Str.replace(SCRIPT, ".out")(name);
  const expected = yield* fileSystem.readFileString(path.join(dir, out));
  const found = yield* lintText({
    root: dir,
    path: "test.yaml",
    kind: "workflow",
    text: "",
    config: configOf(script),
  });
  const have = pipe(
    found,
    Arr.map((diagnostic) => diagnostic.message),
  );
  return { name, want: recorded(expected), have: sortedLines(have) };
});

const differs = (outcome: {
  readonly want: readonly string[];
  readonly have: readonly string[];
}): boolean => !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

test("matches shellcheck on its recorded corpus", () =>
  Effect.gen(function* corpus() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const base = yield* here;
    const dir = path.join(base, CORPUS);
    const entries = yield* fileSystem.readDirectory(dir);
    const isScript = Str.endsWith(".in");
    const scripts = sortedLines(pipe(entries, Arr.filter(isScript)));
    expect(scripts.length).toBeGreaterThan(MINIMUM_SCRIPTS);
    const outcomes = yield* Effect.forEach(scripts, (name) => compare(dir, name), SEQUENTIAL);
    expect(pipe(outcomes, Arr.filter(differs))).toStrictEqual([]);
  }).pipe(services.runPromise));
