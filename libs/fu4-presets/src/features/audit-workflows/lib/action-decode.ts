import { Result } from "effect";

import type {
  ActionModel,
  ActionStepModel,
  DockerImage,
  Runs,
} from "#/features/audit-workflows/model/action.ts";
import type { EnvValue, LoE } from "#/features/audit-workflows/model/common.ts";

import { env, ifCondition, loe, parseDocker, stepHead, stepUses } from "./common.ts";
import {
  anyScalar,
  boolean,
  defaulted,
  map,
  optional,
  record,
  required,
  sequence,
  string,
  struct,
  untagged,
} from "./decode.ts";
import type { Decoder } from "./decode.ts";

const emptyEnv = (): LoE<ReadonlyMap<string, EnvValue>> => ({ type: "literal", value: new Map() });

const input = struct((fields) =>
  Result.all([
    optional("description")(anyScalar)(fields),
    optional("required")(boolean)(fields),
    optional("default")(anyScalar)(fields),
  ]),
);

const output = struct((fields) =>
  Result.all([optional("description")(anyScalar)(fields), optional("value")(anyScalar)(fields)]),
);

const usesBody: Decoder<ActionStepModel["body"]> = struct((fields) =>
  Result.gen(function* decode() {
    const uses = yield* required("uses")(stepUses)(fields);
    const withs = yield* defaulted("with")(loe(env))(emptyEnv)(fields);
    return { type: "uses", uses, with: withs };
  }),
);

const runBody: Decoder<ActionStepModel["body"]> = struct((fields) =>
  Result.gen(function* decode() {
    const run = yield* required("run")(string)(fields);
    const shell = yield* required("shell")(loe(string))(fields);
    const workingDirectory = yield* optional("working-directory")(string)(fields);
    return {
      type: "run",
      run,
      shell,
      workingDirectory,
    };
  }),
);

const step: Decoder<ActionStepModel> = struct((fields) =>
  Result.gen(function* decode() {
    const head = yield* stepHead(fields);
    yield* defaulted("continue-on-error")(loe(boolean))(
      () => ({ type: "literal", value: false }) as const,
    )(fields);
    const stepEnv = yield* defaulted("env")(loe(env))(emptyEnv)(fields);
    const body = yield* untagged(usesBody, runBody)(fields.node);
    return { ...head, env: stepEnv, body };
  }),
);

const dockerUses = map(string)(parseDocker);

const dockerImage: Decoder<DockerImage> = untagged<DockerImage>(
  (node) =>
    Result.liftPredicate(
      { type: "dockerfile" } as const,
      () => node.kind === "scalar" && node.value === "Dockerfile",
      () => "not Dockerfile",
    ),
  map(loe(dockerUses))((image): DockerImage => ({ type: "image", image })),
);

const runs: Decoder<Runs> = untagged<Runs>(
  struct((fields) =>
    Result.gen(function* decode() {
      const using = yield* required("using")(string)(fields);
      yield* required("main")(string)(fields);
      yield* optional("pre")(string)(fields);
      yield* optional("pre-if")(ifCondition)(fields);
      yield* optional("post")(string)(fields);
      yield* optional("post-if")(ifCondition)(fields);
      return { type: "javascript", using };
    }),
  ),
  struct((fields) =>
    Result.gen(function* decode() {
      const using = yield* required("using")(string)(fields);
      const steps = yield* required("steps")(sequence(step))(fields);
      return { type: "composite", using, steps };
    }),
  ),
  struct((fields) =>
    Result.gen(function* decode() {
      const using = yield* required("using")(string)(fields);
      const image = yield* required("image")(dockerImage)(fields);
      const dockerEnv = yield* defaulted("env")(env)(() => new Map())(fields);
      yield* optional("entrypoint")(string)(fields);
      yield* optional("pre-entrypoint")(string)(fields);
      yield* optional("pre-if")(ifCondition)(fields);
      yield* optional("post-entrypoint")(string)(fields);
      yield* optional("post-if")(ifCondition)(fields);
      return { type: "docker", using, image, env: dockerEnv };
    }),
  ),
);

export const decodeAction: Decoder<ActionModel> = struct((fields) =>
  Result.gen(function* decode() {
    const name = yield* optional("name")(anyScalar)(fields);
    yield* optional("author")(anyScalar)(fields);
    yield* optional("description")(anyScalar)(fields);
    const inputs = yield* defaulted("inputs")(record(input))(() => new Map())(fields);
    yield* defaulted("outputs")(record(output))(() => new Map())(fields);
    const each = yield* required("runs")(runs)(fields);
    return { name, inputs: [...inputs.keys()], runs: each };
  }),
);
