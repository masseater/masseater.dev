import { Effect, Layer, Record as Rec, Function as Fn } from "effect";
import type { PlatformError } from "effect/PlatformError";

import { MockOpenRouterLayer } from "./mock-openrouter.test.support.ts";
import type { LoggedRequest, MockOpenRouter } from "./mock-openrouter.test.support.ts";
import { packageRoot, projectFilesFor, runOxlint, writeProject } from "./oxlint.test.support.ts";
import type { OxlintRun, Services, TestError } from "./oxlint.test.support.ts";
import type { DecisionPluginSetup, DecisionRule } from "./types.ts";

const DATA_FIRST_ARITY = 2;

/** @internal */
export type Env = Readonly<Record<string, string>>;

/** @internal */
export type MockTest<Value = void> = Effect.Effect<Value, TestError, Services | MockOpenRouter>;

/** @internal */
export const RESPAN = "openrouter/respan/span-01-lite";
/** @internal */
export const TIMEOUT = 120_000;
/** @internal */
export const PASSED = 0;
/** @internal */
export const FAILED = 1;

/** @internal */
export const callRule: DecisionRule = {
  id: "any-call",
  target: "call",
  question: "Does this call write personal data to a log?",
  cutoff: 0.8,
};

/** @internal */
export const lintExample: {
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

/** @internal */
export interface ProjectRun {
  readonly files: Env;
  readonly options: DecisionPluginSetup;
  readonly env: Env;
  readonly format?: string;
  readonly ruleOptions?: Readonly<Record<string, object>>;
}

/** @internal */
export const lintProject = ({
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

/** @internal */
export const questionCount = (request: LoggedRequest): number =>
  Rec.keys(request.body.questions).length;

/** @internal */
export const modelOf = (request: LoggedRequest): string => request.body.model;

/** @internal */
export const withMock = <Value>(
  effect: Effect.Effect<Value, TestError, MockOpenRouter | Services>,
): Effect.Effect<Value, TestError, Services> =>
  Effect.scoped(
    Effect.flatMap(Layer.build(MockOpenRouterLayer), (context) =>
      Effect.provideContext(effect, context),
    ),
  );

/** @internal */
export const outputOf = (run: OxlintRun): string => `${run.stdout}${run.stderr}`;
