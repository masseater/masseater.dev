import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Result, String as Str, pipe, Option, identity } from "effect";

import type { LoE } from "#/features/audit-workflows/model/common.ts";
import type {
  Container,
  Matrix,
  MatrixRow,
  MatrixValue,
  NormalJobModel,
  Strategy,
} from "#/features/audit-workflows/model/workflow.ts";
import { isNull } from "#/shared/yaml/index.ts";

import { env, loe, parseDocker } from "./common.ts";
import {
  boolean,
  defaulted,
  entriesOf,
  map,
  number,
  optional,
  record,
  required,
  sequence,
  string,
  struct,
  untagged,
} from "./decode.ts";
import type { Decoder } from "./decode.ts";
import { emptyEnv, noStrings } from "./workflow-shared.ts";

const floatText = (raw: string): string => {
  const value = Number(raw);
  if (Number.isInteger(value)) {
    return `${String(value)}.0`;
  }
  return String(value);
};

const TEXT_BY_TAG: Readonly<Record<string, (raw: string) => string>> = {
  "!!int": (raw) => String(Number(raw)),
  "!!float": floatText,
  "!!bool": Str.toLowerCase,
};

const scalarText = (node: YamlNode): MatrixValue => {
  if (isNull(node)) {
    return { kind: "null" };
  }
  const format = Option.getOrElse(
    Option.fromNullishOr(TEXT_BY_TAG[node.tag]),
    () => identity<string>,
  );
  return { kind: "scalar", text: format(node.value) };
};

export const matrixValue = (node: YamlNode): MatrixValue => {
  if (node.kind === "sequence") {
    return { kind: "array", items: pipe(node.children, Arr.map(matrixValue)) };
  }
  if (node.kind === "mapping") {
    return {
      kind: "object",
      entries: pipe(
        Result.getOrElse(entriesOf(node), () => []),
        Arr.map(([key, value]) => [key, matrixValue(value)] as const),
      ),
    };
  }
  return scalarText(node);
};

const anyValue: Decoder<MatrixValue> = (node) => Result.succeed(matrixValue(node));

const matrixRow: Decoder<MatrixRow> = (node) =>
  Result.map(entriesOf(node), (entries) =>
    pipe(
      entries,
      Arr.map(([key, value]) => [key, matrixValue(value)] as const),
    ),
  );

const RESERVED = new Set(["include", "exclude"]);

const dimensionValues = loe(sequence(anyValue));

const dimension = ([key, value]: readonly [string, YamlNode]): Result.Result<
  readonly [string, LoE<readonly MatrixValue[]>],
  string
> =>
  pipe(
    dimensionValues(value),
    Result.map((decoded) => [key, decoded] as const),
  );

const dimensions: Decoder<Matrix["dimensions"]> = (node) =>
  pipe(
    entriesOf(node),
    Result.flatMap((entries) =>
      pipe(
        entries,
        Arr.filter(([key]) => !RESERVED.has(key)),
        Arr.map(dimension),
        Result.all,
      ),
    ),
    Result.map((value) => ({ type: "literal", value }) as const),
  );

const matrixRows = loe(sequence(matrixRow));

const noRows = () => ({ type: "literal", value: [] }) as const;

const matrix: Decoder<Matrix> = struct((fields) =>
  Result.gen(function* decode() {
    const include = yield* defaulted("include")(matrixRows)(noRows)(fields);
    const exclude = yield* defaulted("exclude")(matrixRows)(noRows)(fields);
    const dims = yield* dimensions(fields.node);
    return { include, exclude, dimensions: dims };
  }),
);

const MINIMUM = 0;

const unsigned: Decoder<number> = (node) =>
  Result.flatMap(number(node), (value) =>
    Result.liftPredicate(
      value,
      (each) => node.tag === "!!int" && each >= MINIMUM,
      () => "expected u64",
    ),
  );

export const strategy: Decoder<Strategy> = struct((fields) =>
  Result.gen(function* decode() {
    const each = yield* optional("matrix")(loe(matrix))(fields);
    yield* optional("fail-fast")(loe(boolean))(fields);
    yield* optional("max-parallel")(loe(unsigned))(fields);
    return { matrix: each };
  }),
);

const dockerImage = loe(map(string)((raw) => parseDocker(raw)));

const credentials = struct((fields) =>
  Result.gen(function* decode() {
    const username = yield* optional("username")(string)(fields);
    const password = yield* optional("password")(string)(fields);
    return { username, password };
  }),
);

export const container: Decoder<Container> = untagged<Container>(
  map(dockerImage)((image): Container => ({ type: "name", image })),
  struct((fields) =>
    Result.gen(function* decode() {
      const image = yield* required("image")(dockerImage)(fields);
      const creds = yield* optional("credentials")(credentials)(fields);
      const containerEnv = yield* defaulted("env")(loe(env))(emptyEnv)(fields);
      yield* defaulted("volumes")(sequence(string))(noStrings)(fields);
      yield* optional("options")(string)(fields);
      return {
        type: "container",
        image,
        credentials: creds,
        env: containerEnv,
      };
    }),
  ),
);

export const services: Decoder<NormalJobModel["services"]> = (node) =>
  Result.map(record(container)(node), (each) => [...each.entries()]);
