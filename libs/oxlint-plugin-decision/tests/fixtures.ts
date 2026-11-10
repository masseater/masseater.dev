import { Effect, Layer, Record as Rec, Function as Fn } from "effect";
import type { PlatformError } from "effect/PlatformError";

import type { DecisionPluginSetup, DecisionRule } from "#src/types.ts";

import { MockOpenRouterLayer } from "./mock-openrouter.ts";
import type { LoggedRequest, MockOpenRouter } from "./mock-openrouter.ts";
import { packageRoot, projectFilesFor, runOxlint, writeProject } from "./oxlint.ts";
import type { OxlintRun, Services, TestError } from "./oxlint.ts";

const DATA_FIRST_ARITY = 2;

type Env = Readonly<Record<string, string>>;

type MockTest<Value = void> = Effect.Effect<Value, TestError, Services | MockOpenRouter>;

const RESPAN = "openrouter/respan/span-01-lite";
const TIMEOUT = 120_000;
const PASSED = 0;
const FAILED = 1;

const callRule: DecisionRule = {
  id: "any-call",
  target: "call",
  question: "Does this call write personal data to a log?",
  cutoff: 0.8,
};

const lintExample: {
  (format: string): (env: Env) => Effect.Effect<OxlintRun, PlatformError, Services>;
  (env: Env, format: string): Effect.Effect<OxlintRun, PlatformError, Services>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (env: Env, format: string): Effect.Effect<OxlintRun, PlatformError, Services> =>
    Effect.gen(function* lint() {
      const cwd = yield* packageRoot;
      return yield* runOxlint({
        cwd,
        args: ["--format", format, "-c", "example/oxlint.config.ts", "example/"],
        env,
      });
    }),
);

interface ProjectRun {
  readonly files: Env;
  readonly options: DecisionPluginSetup;
  readonly env: Env;
  readonly format?: string;
  readonly ruleOptions?: Readonly<Record<string, object>>;
}

const lintProject = ({
  files,
  options,
  env,
  format = "unix",
  ruleOptions,
}: ProjectRun): Effect.Effect<OxlintRun, PlatformError, Services> =>
  Effect.scoped(
    Effect.gen(function* lint() {
      const project = yield* projectFilesFor(options, ruleOptions ?? {});
      const cwd = yield* writeProject({ ...files, ...project });
      return yield* runOxlint({
        cwd,
        args: ["--format", format, "-c", "oxlint.config.ts", ...Rec.keys(files)],
        env,
      });
    }),
  );

const questionCount = (request: LoggedRequest): number => Rec.keys(request.body.questions).length;

const modelOf = (request: LoggedRequest): string => request.body.model;

const withMock = <Value>(
  effect: Effect.Effect<Value, TestError, MockOpenRouter | Services>,
): Effect.Effect<Value, TestError, Services> =>
  Effect.scoped(
    Effect.flatMap(Layer.build(MockOpenRouterLayer), (context) =>
      Effect.provideContext(effect, context),
    ),
  );

const outputOf = (run: OxlintRun): string => `${run.stdout}${run.stderr}`;

/** @internal */
export {
  FAILED,
  PASSED,
  RESPAN,
  TIMEOUT,
  callRule,
  lintExample,
  lintProject,
  modelOf,
  outputOf,
  questionCount,
  withMock,
};
/** @internal */
export type { Env, MockTest, ProjectRun };
