import type { Source, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, pipe } from "effect";

import { EMPTY_ACTION } from "#/entities/action/model/types.ts";
import type { ActionMetadata } from "#/entities/action/model/types.ts";
import { decodeString, isPresent } from "#/shared/yaml/decoder.ts";
import type { Sink } from "#/shared/yaml/decoder.ts";
import { valueAt } from "#/shared/yaml/index.ts";

import { decodeInputs, decodeOutputs } from "./decode-inputs.ts";
import { decodeBranding, decodeRuns } from "./decode-runs.ts";

const SINGLE = 1;

const section =
  (node: YamlNode) =>
  <Value>(key: string, decode: (value: YamlNode) => Value, fallback: Value): Value =>
    Option.match(valueAt(key)(node), { onNone: () => fallback, onSome: decode });

const metadataOf = (sink: Sink, node: YamlNode): ActionMetadata => {
  if (!isPresent(sink)(node, "mapping", "actionlint.ActionMetadata")) {
    return EMPTY_ACTION;
  }
  const at = section(node);
  return {
    ...EMPTY_ACTION,
    name: at("name", decodeString(sink), ""),
    description: at("description", decodeString(sink), ""),
    inputs: at("inputs", decodeInputs(sink), {}),
    outputs: at("outputs", decodeOutputs(sink), {}),
    runs: at("runs", decodeRuns(sink), EMPTY_ACTION.runs),
    branding: at("branding", decodeBranding(sink), EMPTY_ACTION.branding),
  };
};

const failure = (errors: readonly string[]): string => {
  if (errors.length === SINGLE) {
    return Arr.join(errors, "");
  }
  return `yaml: unmarshal errors:  ${Arr.join(errors, "  ")}`;
};

export const decodeAction = (source: Source): Result.Result<ActionMetadata, string> => {
  const error = Arr.head(source.errors);
  if (Option.isSome(error)) {
    return Result.fail(`yaml: line ${String(error.value.line)}: ${error.value.message}`);
  }
  const root = Option.fromNullishOr(source.yaml);
  if (Option.isNone(root)) {
    return Result.succeed(EMPTY_ACTION);
  }
  const errors: string[] = [];
  const metadata = metadataOf((message) => {
    errors.push(message);
  }, root.value);
  return pipe(
    Result.succeed(metadata),
    Result.filterOrFail(
      () => Arr.isReadonlyArrayEmpty(errors),
      () => failure(errors),
    ),
  );
};
