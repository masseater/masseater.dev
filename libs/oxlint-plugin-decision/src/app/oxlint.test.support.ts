import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  Predicate,
  Schema,
  Stream,
  Record as Rec,
  String as Str,
  pipe,
  Function as Fn,
} from "effect";
import type { Scope } from "effect";
import type { HttpServerError } from "effect/http";
import type { PlatformError } from "effect/PlatformError";
import { ChildProcess } from "effect/process";
import type { ChildProcessSpawner } from "effect/process";

import { toJson } from "#/entities/decision/index.ts";
import type { DecisionPluginSetup } from "#/entities/decision/index.ts";
import { CACHE_DIR } from "#/features/serve-decisions/index.test.support.ts";

import { MockOpenRouter } from "./mock-openrouter.test.support.ts";

const DATA_FIRST_ARITY = 2;

/** @internal */
export interface OxlintRun {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** @internal */
export interface OxlintCall {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

/** @internal */
export type Services = FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
export type TestError =
  | PlatformError
  | Schema.SchemaError
  | Config.ConfigError
  | HttpServerError.ServeError;

const PASSED_ENV = [
  "PATH",
  "HOME",
  "HTTPS_PROXY",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
  "NODE_EXTRA_CA_CERTS",
  "NODE_USE_ENV_PROXY",
  "SSL_CERT_FILE",
  "NODE_V8_COVERAGE",
] as const;

const DECISION_PLUGINS = ["decision", "team"] as const;

const OPENROUTER_DEFAULT = "openrouter/~typesafe/jev-latest";

const inPackage = (...segments: readonly string[]): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* resolve() {
    const path = yield* Path.Path;
    return path.join(import.meta.dirname, "../..", ...segments);
  });

/** @internal */
export const packageRoot = inPackage();
/** @internal */
export const pluginPath = inPackage("dist", "index.mjs");
/** @internal */
export const cacheDirOf = (root: string): Effect.Effect<string, never, Path.Path> =>
  Path.Path.pipe(Effect.map((path) => path.join(root, ...CACHE_DIR)));

const inheritedEnv: Effect.Effect<Readonly<Record<string, string>>> = Effect.map(
  pipe(
    PASSED_ENV,
    Arr.map((name) => Config.option(Config.String(name)).pipe(Effect.orDie)),
    Effect.all,
  ),
  (values) =>
    Rec.fromEntries(
      pipe(
        Arr.zip(PASSED_ENV, values),
        Arr.flatMap(([name, value]) =>
          Option.match(value, { onNone: () => [], onSome: (found) => [[name, found] as const] }),
        ),
      ),
    ),
);

const textOf = <Err, Req>(
  stream: Stream.Stream<Uint8Array, Err, Req>,
): Effect.Effect<string, Err, Req> => stream.pipe(Stream.decodeText(), Stream.mkString);

/** @internal */
export const runOxlint = ({
  cwd,
  args,
  env,
}: OxlintCall): Effect.Effect<OxlintRun, PlatformError, Services> =>
  Effect.scoped(
    Effect.gen(function* run() {
      const bin = yield* inPackage("node_modules", "oxlint", "bin", "oxlint");
      const inherited = yield* inheritedEnv;
      const handle = yield* ChildProcess.make(bin, args, {
        cwd,
        env: { ...inherited, ...env },
        extendEnv: false,
      });
      const [stdout, stderr, status] = yield* Effect.all(
        [textOf(handle.stdout), textOf(handle.stderr), handle.exitCode],
        { concurrency: "unbounded" },
      );
      return { stdout, stderr, status: Number(status) };
    }),
  );

/** @internal */
export const removeCache = (root: string): Effect.Effect<void, PlatformError, Services> =>
  Effect.gen(function* remove() {
    const fs = yield* FileSystem.FileSystem;
    const cacheDir = yield* cacheDirOf(root);
    yield* fs.remove(cacheDir, { recursive: true, force: true });
  });

/** @internal */
export const writeProject = (
  files: Readonly<Record<string, string>>,
): Effect.Effect<string, PlatformError, Services | Scope.Scope> =>
  Effect.gen(function* write() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* fs.makeTempDirectoryScoped({ prefix: "decision-" });
    yield* Effect.forEach(Rec.toEntries(files), ([name, content]) =>
      fs.writeFileString(path.join(dir, name), content),
    );
    return dir;
  });

/** @internal */
export const configSource = (config: object): string => `export default ${toJson(config)};\n`;

const ruleEntry = (options: object | undefined): unknown =>
  Option.match(Option.fromUndefinedOr(options), {
    onNone: () => "error",
    onSome: (value) => ["error", value],
  });

const FUNCTION_KEY = "\u0000function";
const SERIALIZED_FUNCTION = /\{"\\u0000function":(?<source>"(?:[^"\\]|\\.)*")\}/u;
const SPLIT_STEP = 2;
const TEXT_PART = 0;

const withFunctions = (_key: string, value: unknown): unknown => {
  if (Predicate.isFunction(value)) {
    return { [FUNCTION_KEY]: String(value) };
  }
  return value;
};

const encodeSetup = Schema.encodeUnknownOption(
  Schema.fromJsonString(Schema.Unknown, { replacer: withFunctions }),
);

const decodeSource = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.String));

const restoreFunction = (part: string, position: number): string => {
  if (position % SPLIT_STEP === TEXT_PART) {
    return part;
  }
  return Option.getOrElse(decodeSource(part), () => part);
};

const setupSource = (setup: DecisionPluginSetup): string =>
  pipe(
    Option.getOrElse(encodeSetup(setup), () => "{}"),
    Str.split(SERIALIZED_FUNCTION),
    Arr.map(restoreFunction),
    Arr.join(""),
  );

/** @internal */
export const projectFilesFor: {
  (
    ruleOptions: Readonly<Record<string, object>>,
  ): (
    setup: DecisionPluginSetup,
  ) => Effect.Effect<Readonly<Record<string, string>>, never, Path.Path>;
  (
    setup: DecisionPluginSetup,
    ruleOptions: Readonly<Record<string, object>>,
  ): Effect.Effect<Readonly<Record<string, string>>, never, Path.Path>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    setup: DecisionPluginSetup,
    ruleOptions: Readonly<Record<string, object>>,
  ): Effect.Effect<Readonly<Record<string, string>>, never, Path.Path> =>
    pluginPath.pipe(
      Effect.map((plugin) => ({
        "plugin.mjs": `import { createDecisionPlugin } from ${toJson(plugin)};\n\nexport default createDecisionPlugin(${setupSource({ model: OPENROUTER_DEFAULT, ...setup })});\n`,
        "oxlint.config.ts": configSource({
          jsPlugins: ["./plugin.mjs"],
          rules: pipe(
            setup.rules,
            Arr.map(({ id }) => [`decision/${id}`, ruleEntry(ruleOptions[id])] as const),
            Rec.fromEntries,
          ),
        }),
      })),
    ),
);

/** @internal */
export const mockEnv = (
  token: string,
): Effect.Effect<Readonly<Record<string, string>>, never, MockOpenRouter> =>
  MockOpenRouter.pipe(
    Effect.map(({ baseURL }) => ({ OPENROUTER_API_KEY: token, OPENROUTER_BASE_URL: baseURL })),
  );

/** @internal */
export const decisionLines = (run: OxlintRun): readonly string[] =>
  pipe(
    Str.split(run.stdout, "\n"),
    Arr.filter((line) =>
      pipe(
        DECISION_PLUGINS,
        Arr.some((name) => Str.includes(`/${name}(`)(line)),
      ),
    ),
  );

const Span = Schema.Struct({
  offset: Schema.Finite,
  line: Schema.Finite,
  column: Schema.Finite,
  length: Schema.Finite,
});

const Diagnostic = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  labels: Schema.Array(Schema.Struct({ span: Span })),
});

const Report = Schema.fromJsonString(Schema.Struct({ diagnostics: Schema.Array(Diagnostic) }));

/** @internal */
export type OxlintDiagnostic = typeof Diagnostic.Type;
/** @internal */
export type OxlintSpan = typeof Span.Type;

/** @internal */
export const diagnosticsOf = (
  run: OxlintRun,
): Effect.Effect<readonly OxlintDiagnostic[], Schema.SchemaError> =>
  Schema.decodeEffect(Report)(run.stdout).pipe(
    Effect.map(({ diagnostics }) =>
      pipe(
        diagnostics,
        Arr.filter((diagnostic) =>
          pipe(
            DECISION_PLUGINS,
            Arr.some((name) => Str.startsWith(`${name}(`)(diagnostic.code)),
          ),
        ),
      ),
    ),
  );

/** @internal */
export const firstSpan = (diagnostic: OxlintDiagnostic): OxlintSpan =>
  Option.getOrThrow(Arr.head(diagnostic.labels)).span;
