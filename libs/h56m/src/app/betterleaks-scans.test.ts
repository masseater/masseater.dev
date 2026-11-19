import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Record,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { expect } from "vite-plus/test";

import type { Finding } from "#/shared/config/index.ts";
import type { H56mError } from "#/shared/lib/errors.ts";

import { makeDetector } from "./index.ts";

const FIXTURE = "fixtures/betterleaks-scans.json.gz";
const KNOWN = "fixtures/betterleaks-scans-known-failures.txt";
const NO_PATH = "input";
const FIRST_LINE = 1;
const NOWHERE = 0;
const TIMEOUT = 1_200_000;
const SEQUENTIAL = { concurrency: 1 } as const;

const ExpectedSchema = Schema.Struct({
  rule: Schema.String,
  secret: Schema.String,
  line: Schema.Int,
  column: Schema.Int,
  endLine: Schema.Int,
  endColumn: Schema.Int,
});

type Expected = typeof ExpectedSchema.Type;

const ScanSchema = Schema.Struct({
  id: Schema.String,
  config: Schema.String,
  maxDecodeDepth: Schema.Int,
  unsupported: Schema.Array(Schema.String),
  raw: Schema.String,
  path: Schema.String,
  startLine: Schema.Int,
  columnOffset: Schema.Int,
  expect: Schema.Array(ExpectedSchema),
});

type Scan = typeof ScanSchema.Type;

const Recorded = Schema.fromJsonString(
  Schema.Struct({
    configs: Schema.Record(Schema.String, Schema.String),
    scans: Schema.Array(ScanSchema),
  }),
);

interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const keyOf = (found: Expected): string => {
  if (Str.isEmpty(found.secret) && found.line === NOWHERE) {
    return `${found.rule}|`;
  }
  return `${found.rule}|${found.secret}|${String(found.line)}:${String(found.column)}-${String(found.endLine)}:${String(found.endColumn)}`;
};

const isPathOnly = (found: Finding): boolean =>
  Str.isEmpty(found.secret) && found.line === FIRST_LINE && found.endColumn === NOWHERE;

const shiftOf = (scan: Scan): number => Math.max(scan.startLine, FIRST_LINE) - FIRST_LINE;

const offsetOn = (scan: Scan, line: number): number =>
  Number(line === FIRST_LINE) * scan.columnOffset;

const expectedOf =
  (scan: Scan) =>
  (found: Finding): Expected => {
    if (isPathOnly(found)) {
      return {
        rule: found.rule,
        secret: "",
        line: NOWHERE,
        column: NOWHERE,
        endLine: NOWHERE,
        endColumn: NOWHERE,
      };
    }
    return {
      rule: found.rule,
      secret: found.secret,
      line: found.line + shiftOf(scan),
      column: found.column + offsetOn(scan, found.line),
      endLine: found.endLine + shiftOf(scan),
      endColumn: found.endColumn + offsetOn(scan, found.endLine),
    };
  };

const sortedKeys = (found: readonly Expected[]): readonly string[] =>
  Arr.sort(pipe(found, Arr.map(keyOf)), Str.Order);

const pathOf = (scan: Scan): string => {
  if (Str.isEmpty(scan.path)) {
    return NO_PATH;
  }
  return scan.path;
};

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const recorded = Effect.gen(function* recorded() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* here;
  const bytes = yield* fileSystem.readFile(path.join(dir, FIXTURE));
  const gzipped = new Blob([Uint8Array.from(bytes)]).stream();
  const text = yield* Effect.promise(() =>
    new Response(gzipped.pipeThrough(new DecompressionStream("gzip"))).text(),
  );
  return yield* Schema.decodeEffect(Recorded)(text);
});

const writtenConfigs = Effect.fn("writtenConfigs")(function* writtenConfigs(
  configs: Readonly<Record<string, string>>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* fileSystem.makeTempDirectoryScoped();
  const written = yield* Effect.forEach(
    Record.toEntries(configs),
    ([hash, text]) => {
      const file = path.join(dir, `${hash}.toml`);
      return Effect.as(fileSystem.writeFileString(file, text), [hash, file] as const);
    },
    SEQUENTIAL,
  );
  return new Map(written);
});

const configPath = (files: ReadonlyMap<string, string>, scan: Scan): string =>
  Option.getOrElse(Option.fromNullishOr(files.get(scan.config)), () => "");

const found =
  (files: ReadonlyMap<string, string>) =>
  (scan: Scan): Effect.Effect<readonly Finding[], H56mError> =>
    makeDetector({
      extend: { path: configPath(files, scan) },
      maxDecodeDepth: scan.maxDecodeDepth,
    }).pipe(
      Effect.flatMap((detector) => detector.scanText({ path: pathOf(scan), text: scan.raw })),
    );

const failureKeys = ({ message }: { readonly message: string }): readonly string[] => [
  `error: ${message}`,
];

const keysOf =
  (scan: Scan) =>
  (findings: readonly Finding[]): readonly string[] => {
    const expected = pipe(findings, Arr.map(expectedOf(scan)));
    return sortedKeys(expected);
  };

const scanned =
  (files: ReadonlyMap<string, string>) =>
  (scan: Scan): Effect.Effect<readonly string[]> =>
    Effect.match(found(files)(scan), { onFailure: failureKeys, onSuccess: keysOf(scan) });

const outcomeOf =
  (files: ReadonlyMap<string, string>) =>
  (scan: Scan): Effect.Effect<Outcome> => {
    const want = sortedKeys(scan.expect);
    if (Arr.isReadonlyArrayNonEmpty(scan.unsupported)) {
      return Effect.succeed({
        id: scan.id,
        want,
        have: [`not run: ${Arr.join(scan.unsupported, ", ")}`],
      });
    }
    return Effect.map(scanned(files)(scan), (have) => ({ id: scan.id, want, have }));
  };

const differs = (outcome: Outcome): boolean =>
  !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

const knownIds = (text: string): readonly string[] =>
  pipe(
    Str.split("\n")(text),
    Arr.map((line) => Str.trim(Arr.headNonEmpty(Str.split(" #")(line)))),
    Arr.filter(Str.isNonEmpty),
  );

interface Verdict {
  readonly unexpected: readonly Outcome[];
  readonly fixed: readonly string[];
}

const verdictOf = (known: readonly string[], outcomes: readonly Outcome[]): Verdict => {
  const failingIds = pipe(
    outcomes,
    Arr.filter(differs),
    Arr.map((outcome) => outcome.id),
  );
  return {
    unexpected: pipe(
      outcomes,
      Arr.filter((outcome) => differs(outcome) && !Arr.contains(known, outcome.id)),
    ),
    fixed: pipe(
      known,
      Arr.filter((id) => !Arr.contains(failingIds, id)),
    ),
  };
};

const matchesEveryScan = Effect.gen(function* matchesEveryScan() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* here;
  const { configs, scans } = yield* recorded;
  const files = yield* writtenConfigs(configs);
  const outcomes = yield* Effect.forEach(scans, outcomeOf(files), SEQUENTIAL);
  const known = yield* fileSystem.readFileString(path.join(dir, KNOWN));
  expect(verdictOf(knownIds(known), outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
});

layer(nodeServicesLayer)("Betterleaks engine scans", (it) => {
  it.effect(
    "finds what Betterleaks finds in every scan of its own tests",
    () => Effect.scoped(matchesEveryScan),
    TIMEOUT,
  );
});
