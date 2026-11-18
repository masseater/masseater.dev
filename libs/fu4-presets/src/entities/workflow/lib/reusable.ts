import type { Source, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { EMPTY_METADATA } from "#/entities/workflow/model/reusable.ts";
import type { ReusableMetadata } from "#/entities/workflow/model/reusable.ts";
import type { Sink } from "#/shared/yaml/index.ts";
import { isPresent, pairsOf, valueAt } from "#/shared/yaml/index.ts";

import { inputsOf, outputsOf, secretsOf } from "./reusable-sections.ts";

const CALL = "workflow_call";

const isCall = (node: YamlNode): boolean => Str.toLowerCase(node.value) === CALL;

const metadataOf = (sink: Sink, node: YamlNode): ReusableMetadata => {
  if (!isPresent(sink)(node, "mapping", "actionlint.ReusableWorkflowMetadata")) {
    return EMPTY_METADATA;
  }
  const section = (key: string): Option.Option<YamlNode> => valueAt(key)(node);
  return {
    inputs: pipe(
      section("inputs"),
      Option.map(inputsOf(sink)),
      Option.getOrElse(() => ({})),
    ),
    outputs: pipe(
      section("outputs"),
      Option.map(outputsOf(sink)),
      Option.getOrElse(() => ({})),
    ),
    secrets: pipe(
      section("secrets"),
      Option.map(secretsOf(sink)),
      Option.getOrElse(() => ({})),
    ),
  };
};

const decodeCall = (node: YamlNode): Result.Result<ReusableMetadata, string> => {
  const errors: string[] = [];
  const metadata = metadataOf((message) => {
    errors.push(message);
  }, node);
  if (Arr.isReadonlyArrayEmpty(errors)) {
    return Result.succeed(metadata);
  }
  return Result.fail(`yaml: unmarshal errors:\n  ${Arr.join(errors, "\n  ")}`);
};

const fromOn = (on: YamlNode): Result.Result<ReusableMetadata, string> => {
  const call = pipe(
    pairsOf(on),
    Arr.findFirst((pair) => isCall(pair.key)),
  );
  if (on.kind === "mapping" && Option.isSome(call)) {
    return decodeCall(call.value.value);
  }
  if (
    (on.kind === "scalar" && isCall(on)) ||
    (on.kind === "sequence" && pipe(on.children, Arr.some(isCall)))
  ) {
    return Result.succeed(EMPTY_METADATA);
  }
  return Result.fail(
    `"workflow_call" event trigger is not found in "on:" at line:${String(on.line)}, column:${String(on.column)}`,
  );
};

export const reusableOf = (source: Source): Result.Result<ReusableMetadata, string> => {
  const error = Arr.head(source.errors);
  if (Option.isSome(error)) {
    return Result.fail(`yaml: line ${String(error.value.line)}: ${error.value.message}`);
  }
  const on = pipe(
    Option.fromNullishOr(source.yaml),
    Option.filter((root) => root.kind === "mapping"),
    Option.flatMap(valueAt("on")),
  );
  if (Option.isNone(on)) {
    return Result.fail('"on:" is not found');
  }
  return fromOn(on.value);
};
