import { Array as Arr, Option, Result, pipe } from "effect";

import type { EnvValue } from "#/features/zizmor/model/common.ts";
import type {
  Concurrency,
  Defaults,
  DeploymentEnvironment,
  JobModel,
  NormalJobModel,
  RawStep,
  ReusableJobModel,
  RunsOn,
  Secrets,
  SharedStepFields,
  StepModel,
  WorkflowModel,
} from "#/features/zizmor/model/workflow.ts";

import {
  DEFAULT_PERMISSIONS,
  boolOrString,
  env,
  ifCondition,
  loe,
  permissions,
  reusableUses,
  stepUses,
} from "./common.ts";
import {
  anyScalar,
  boolean,
  defaulted,
  entriesOf,
  literal,
  map,
  number,
  optional,
  required,
  sequence,
  string,
  struct,
  untagged,
  unit,
} from "./decode.ts";
import type { Decoder, Fields } from "./decode.ts";
import { container, services, strategy } from "./job-decode.ts";
import { nullAsTrue, trigger } from "./trigger-decode.ts";
import { CACHE_MODES, emptyEnv, noStrings, strings } from "./workflow-shared.ts";

const runDefaults = struct((fields) =>
  Result.gen(function* decode() {
    const shell = yield* optional("shell")(loe(string))(fields);
    const workingDirectory = yield* optional("working-directory")(anyScalar)(fields);
    return { shell, workingDirectory };
  }),
);

const defaults: Decoder<Defaults> = struct((fields) =>
  Result.map(optional("run")(runDefaults)(fields), (run) => ({ run })),
);

const concurrency: Decoder<Concurrency> = untagged<Concurrency>(
  map(string)((group) => ({ type: "bare", group })),
  struct((fields) =>
    Result.gen(function* decode() {
      const group = yield* required("group")(string)(fields);
      const cancelInProgress = yield* defaulted("cancel-in-progress")(loe(boolean))(
        () => ({ type: "literal", value: false }) as const,
      )(fields);
      return { type: "rich", group, cancelInProgress };
    }),
  ),
);

const runsOnGroup: Decoder<RunsOn> = struct((fields) =>
  Result.gen(function* decode() {
    const group = yield* optional("group")(string)(fields);
    const labels = yield* defaulted("labels")(strings)(noStrings)(fields);
    return yield* Result.liftPredicate(
      { type: "group" as const, group, labels },
      () => Option.isSome(group) || Arr.isReadonlyArrayNonEmpty(labels),
      () => "runs-on must provide either `group` or one or more `labels`",
    );
  }),
);

const runsOn: Decoder<RunsOn> = untagged<RunsOn>(
  map(strings)((labels) => ({ type: "target", labels })),
  runsOnGroup,
);

const environment: Decoder<DeploymentEnvironment> = untagged<DeploymentEnvironment>(
  map(string)((name) => ({ type: "name", name })),
  struct((fields) =>
    Result.gen(function* decode() {
      const name = yield* required("name")(string)(fields);
      const url = yield* optional("url")(string)(fields);
      return { type: "name-url", name, url };
    }),
  ),
);

const shared = (fields: Fields): Result.Result<SharedStepFields, string> =>
  Result.gen(function* decode() {
    const id = yield* optional("id")(string)(fields);
    const condition = yield* optional("if")(ifCondition)(fields);
    const name = yield* optional("name")(string)(fields);
    yield* optional("timeout-minutes")(loe(number))(fields);
    yield* defaulted("continue-on-error")(loe(boolean))(
      () => ({ type: "literal", value: false }) as const,
    )(fields);
    yield* defaulted("background")(boolean)(() => false)(fields);
    const stepEnv = yield* defaulted("env")(loe(env))(emptyEnv)(fields);
    return { id, if: condition, name, env: stepEnv };
  });

const usesStep: Decoder<StepModel> = struct((fields) =>
  Result.gen(function* decode() {
    const uses = yield* required("uses")(stepUses)(fields);
    const withs = yield* defaulted("with")(loe(env))(emptyEnv)(fields);
    const common = yield* shared(fields);
    return {
      ...common,
      body: { type: "uses", uses, with: withs },
    };
  }),
);

const runStep: Decoder<StepModel> = struct((fields) =>
  Result.gen(function* decode() {
    const run = yield* required("run")(boolOrString)(fields);
    const workingDirectory = yield* optional("working-directory")(string)(fields);
    const shell = yield* optional("shell")(loe(string))(fields);
    const common = yield* shared(fields);
    return {
      ...common,
      body: { type: "run", run, workingDirectory, shell },
    };
  }),
);

const control = (field: string, decoder: Decoder<unknown>): Decoder<RawStep> =>
  struct((fields) =>
    Result.gen(function* decode() {
      yield* optional("name")(string)(fields);
      yield* optional("id")(string)(fields);
      yield* required(field)(decoder)(fields);
      return { type: "control" };
    }),
  );

const stepModel = untagged<StepModel>(usesStep, runStep);

const step: Decoder<RawStep> = untagged<RawStep>(
  map(stepModel)((each): RawStep => ({ type: "step", step: each })),
  control("wait", strings),
  control("wait-all", untagged<boolean>(boolean, nullAsTrue)),
  control("cancel", string),
  struct((fields) =>
    Result.map(required("parallel")(sequence(stepModel))(fields), (steps) => ({
      type: "parallel",
      steps,
    })),
  ),
);

type JobCommon = Pick<NormalJobModel, "name" | "cacheMode" | "permissions" | "needs" | "if">;

const jobCommon = (fields: Fields): Result.Result<JobCommon, string> =>
  Result.all({
    name: optional("name")(string)(fields),
    cacheMode: optional("cache-mode")(literal(CACHE_MODES))(fields),
    permissions: defaulted("permissions")(permissions)(() => DEFAULT_PERMISSIONS)(fields),
    needs: defaulted("needs")(strings)(noStrings)(fields),
    if: optional("if")(ifCondition)(fields),
  });

const loeBoolean = loe(boolean);

const loeNumber = loe(number);

const sequenceStep = sequence(step);

const loeEnv = loe(env);

const loeRunsOn = loe(runsOn);

const normalJob: Decoder<JobModel> = struct((fields) =>
  Result.map(
    Result.all({
      common: jobCommon(fields),
      runsOn: required("runs-on")(loeRunsOn)(fields),
      environment: optional("environment")(environment)(fields),
      concurrency: optional("concurrency")(concurrency)(fields),
      outputs: defaulted("outputs")(env)(() => new Map())(fields),
      env: defaulted("env")(loeEnv)(emptyEnv)(fields),
      defaults: optional("defaults")(defaults)(fields),
      steps: required("steps")(sequenceStep)(fields),
      timeout: optional("timeout-minutes")(loeNumber)(fields),
      strategy: optional("strategy")(strategy)(fields),
      continueOnError: defaulted("continue-on-error")(loeBoolean)(
        () => ({ type: "literal", value: false }) as const,
      )(fields),
      container: optional("container")(container)(fields),
      services: defaulted("services")(services)(() => [])(fields),
    }),
    ({
      common,
      outputs: _outputs,
      timeout: _timeout,
      continueOnError: _continue,
      ...rest
    }): NormalJobModel => ({
      type: "normal",
      ...common,
      ...rest,
    }),
  ),
);

const nullAsEmptyEnv = map(unit)((): ReadonlyMap<string, EnvValue> => new Map());

const secretsEnv = untagged<ReadonlyMap<string, EnvValue>>(env, nullAsEmptyEnv);

const inherit = literal(["inherit"]);

const secrets: Decoder<Secrets> = untagged<Secrets>(
  map(inherit)((): Secrets => ({ type: "inherit" })),
  map(secretsEnv)((each): Secrets => ({ type: "env", env: each })),
);

const reusableJob: Decoder<JobModel> = struct((fields) =>
  Result.map(
    Result.all({
      common: jobCommon(fields),
      uses: required("uses")(reusableUses)(fields),
      with: defaulted("with")(loeEnv)(emptyEnv)(fields),
      secrets: optional("secrets")(secrets)(fields),
    }),
    ({ common, ...rest }): ReusableJobModel => ({ type: "reusable", ...common, ...rest }),
  ),
);

const job = untagged<JobModel>(normalJob, reusableJob);

const jobs: Decoder<WorkflowModel["jobs"]> = (node) =>
  Result.flatMap(entriesOf(node), (entries) =>
    Result.all(
      pipe(
        entries,
        Arr.map(([id, each]) => Result.map(job(each), (decoded) => [id, decoded] as const)),
      ),
    ),
  );

export const decodeWorkflow: Decoder<WorkflowModel> = struct((fields) =>
  Result.all({
    name: optional("name")(anyScalar)(fields),
    runName: optional("run-name")(anyScalar)(fields),
    on: required("on")(trigger)(fields),
    cacheMode: optional("cache-mode")(literal(CACHE_MODES))(fields),
    permissions: defaulted("permissions")(permissions)(() => DEFAULT_PERMISSIONS)(fields),
    env: defaulted("env")(loe(env))(emptyEnv)(fields),
    defaults: optional("defaults")(defaults)(fields),
    concurrency: optional("concurrency")(concurrency)(fields),
    jobs: required("jobs")(jobs)(fields),
  }),
);
