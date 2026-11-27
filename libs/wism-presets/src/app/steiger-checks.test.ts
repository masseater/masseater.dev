import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lint } from "@r_masseater/wism";
import type { Diagnostic } from "@r_masseater/wism";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { workspace } from "#/entities/kind/index.ts";

import { structure } from "./preset.ts";

const FIXTURE = "fixtures/steiger/steiger-checks.json";
const KNOWN = "fixtures/steiger/steiger-checks-known-failures.txt";
const PACKAGE = "pkg";
const SOURCE = `${PACKAGE}/src`;
const PLACEHOLDER = "index.ts";
const SEPARATOR = "/";
const PREFIX = "structure/";
const CROSS_IMPORT = "Forbidden cross-import";
const NO_BASE = "./src";
const SEQUENTIAL = { concurrency: 1 } as const;
const CONFIG = structure({ kinds: [workspace({ paths: [PACKAGE] })], presets: ["fsd"] });

const FoundSchema = Schema.Struct({ message: Schema.String, path: Schema.String });

const PathsSchema = Schema.Record(Schema.String, Schema.Array(Schema.String));

const TsconfigSchema = Schema.Struct({ baseUrl: Schema.String, paths: PathsSchema });

const CaseSchema = Schema.Struct({
  id: Schema.String,
  rule: Schema.String,
  test: Schema.String,
  files: Schema.Record(Schema.String, Schema.String),
  folders: Schema.Array(Schema.String),
  tsconfig: Schema.NullOr(TsconfigSchema),
  found: Schema.Array(FoundSchema),
});

type Case = typeof CaseSchema.Type;
type Found = typeof FoundSchema.Type;

const Recorded = CaseSchema.pipe(Schema.Array, Schema.fromJsonString);

const TsconfigFile = Schema.fromJsonString(Schema.Unknown);

const RULES: Readonly<Record<string, readonly string[]>> = {
  "forbidden-imports": ["layer-import", "cross-slice"],
  "no-higher-level-imports": ["layer-import"],
  "no-cross-imports": ["cross-slice"],
  "no-public-api-sidestep": ["public-api"],
  "no-wildcard-exports": ["wildcard-export"],
  "typo-in-layer-name": ["layer-name"],
};

interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const rulesOf = (check: Case): readonly string[] =>
  Option.getOrElse(Option.fromNullishOr(RULES[check.rule]), () => []);

const ruleFor =
  (check: Case) =>
  ({ message }: Found): string => {
    if (check.rule !== "forbidden-imports") {
      return Option.getOrElse(Arr.head(rulesOf(check)), () => "");
    }
    if (Str.startsWith(CROSS_IMPORT)(message)) {
      return "cross-slice";
    }
    return "layer-import";
  };

const sortedKeys = (keys: readonly string[]): readonly string[] =>
  Arr.sort(Arr.dedupe(keys), Str.Order);

const wantOf = (check: Case): readonly string[] =>
  sortedKeys(
    pipe(
      check.found,
      Arr.map((found) => `${ruleFor(check)(found)} ${found.path}`),
    ),
  );

const underSource = (file: string): string => Str.slice(SOURCE.length + SEPARATOR.length)(file);

const layerOf = (file: string): string => Arr.headNonEmpty(Str.split(SEPARATOR)(underSource(file)));

const haveOf =
  (check: Case) =>
  (diagnostics: readonly Diagnostic[]): readonly string[] =>
    sortedKeys(
      pipe(
        diagnostics,
        Arr.map(({ rule, path }) => ({ rule: Str.slice(PREFIX.length)(rule), path })),
        Arr.filter(({ rule }) => Arr.contains(rulesOf(check), rule)),
        Arr.map(({ rule, path }) => {
          if (rule === "layer-name") {
            return `${rule} ${layerOf(path)}`;
          }
          return `${rule} ${underSource(path)}`;
        }),
      ),
    );

const holdsFile = (check: Case, folder: string): boolean =>
  pipe(
    Rec.keys(check.files),
    Arr.some((file) => Str.startsWith(`${folder}${SEPARATOR}`)(file)),
  );

const placeholders = (check: Case): readonly (readonly [string, string])[] =>
  pipe(
    check.folders,
    Arr.filter((folder) => !holdsFile(check, folder)),
    Arr.filter(
      (folder) =>
        !pipe(
          check.folders,
          Arr.some((other) => Str.startsWith(`${folder}${SEPARATOR}`)(other)),
        ),
    ),
    Arr.map((folder) => [`${folder}${SEPARATOR}${PLACEHOLDER}`, ""] as const),
  );

const baseOf = (baseUrl: string): string => {
  if (Str.isEmpty(baseUrl)) {
    return NO_BASE;
  }
  return `${NO_BASE}/${baseUrl}`;
};

const tsconfigText = Effect.fn("tsconfigText")(function* tsconfigText({
  baseUrl,
  paths,
}: typeof TsconfigSchema.Type) {
  const text = yield* Schema.encodeEffect(TsconfigFile)({
    compilerOptions: { baseUrl: baseOf(baseUrl), paths },
  });
  return [`${PACKAGE}/tsconfig.json`, text] as const;
});

const treeOf = Effect.fn("treeOf")(function* treeOf(check: Case) {
  const tsconfig = yield* Effect.forEach(
    Option.toArray(Option.fromNullishOr(check.tsconfig)),
    tsconfigText,
    SEQUENTIAL,
  );
  const sources = pipe(
    [...Rec.toEntries(check.files), ...placeholders(check)],
    Arr.map(([file, text]) => [`${SOURCE}/${file}`, text] as const),
  );
  return [
    [`${PACKAGE}/package.json`, `{ "name": "${PACKAGE}" }`] as const,
    ...tsconfig,
    ...sources,
  ];
});

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const recorded = Effect.gen(function* recorded() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* here;
  const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
  return yield* Schema.decodeEffect(Recorded)(text);
});

const linted = Effect.fn("linted")(function* linted(check: Case) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped();
  const tree = yield* treeOf(check);
  yield* Effect.forEach(
    tree,
    ([name, text]) =>
      Effect.gen(function* write() {
        const file = path.join(root, name);
        yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
        yield* fileSystem.writeFileString(file, text);
      }),
    SEQUENTIAL,
  );
  const files = pipe(
    tree,
    Arr.map(([name]) => name),
  );
  return yield* lint({ root, files, config: CONFIG });
}, Effect.scoped);

const failureKeys = ({ message }: { readonly message: string }): readonly string[] => [
  `error: ${message}`,
];

const outcomeOf = (check: Case): Effect.Effect<Outcome, never, FileSystem.FileSystem | Path.Path> =>
  Effect.map(
    Effect.match(linted(check), { onFailure: failureKeys, onSuccess: haveOf(check) }),
    (have) => ({ id: check.id, want: wantOf(check), have }),
  );

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

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("finds what steiger finds in every check of its tests that wism has a rule for", () =>
  Effect.gen(function* matchesEveryCheck() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const checks = yield* recorded;
    const outcomes = yield* Effect.forEach(checks, outcomeOf, SEQUENTIAL);
    const known = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    expect(verdictOf(knownIds(known), outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
