import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { CallInput, CallInputKind, CallSecret } from "#/entities/workflow/model/reusable.ts";
import {
  decodeBoolean,
  decodeOptionalString,
  decodeString,
  flagAt,
  isMappingOrError,
  isPresent,
  lowerKey,
  typeError,
} from "#/shared/yaml/decoder.ts";
import type { Sink } from "#/shared/yaml/decoder.ts";
import { isNull, pairsOf, valueAt } from "#/shared/yaml/index.ts";

export type Inputs = Readonly<Record<string, CallInput>>;
export type Secrets = Readonly<Record<string, CallSecret>>;

const KINDS: Readonly<Record<string, CallInputKind>> = {
  boolean: "boolean",
  number: "number",
  string: "string",
};

interface Fields {
  readonly required: boolean;
  readonly defaulted: boolean;
  readonly type: string;
}

const fieldsOf = (sink: Sink, node: YamlNode): Fields => ({
  required: flagAt(sink)("required")(node),
  defaulted: Option.exists(valueAt("default")(node), (value) =>
    Option.isSome(decodeOptionalString(sink)(value)),
  ),
  type: Option.match(valueAt("type")(node), { onNone: () => "", onSome: decodeString(sink) }),
});

const inputOf =
  (sink: Sink) =>
  (name: string, node: YamlNode): Option.Option<CallInput> => {
    if (isNull(node)) {
      return Option.some({ name, required: false, kind: "any" });
    }
    if (node.kind !== "mapping") {
      typeError(sink)(node, "actionlint.metadata");
      return Option.none();
    }
    let failed = false;
    const fields = fieldsOf((message) => {
      failed = true;
      sink(message);
    }, node);
    return pipe(
      Option.liftPredicate(fields, () => !failed),
      Option.map((found) => ({
        name,
        required: found.required && !found.defaulted,
        kind: Option.getOrElse(Rec.get(KINDS, found.type), (): CallInputKind => "any"),
      })),
    );
  };

export const inputsOf =
  (sink: Sink) =>
  (node: YamlNode): Inputs => {
    let out: Inputs = {};
    if (isNull(node) || !isMappingOrError(sink)(node, "on.workflow_call.inputs")) {
      return out;
    }
    for (const { key, value } of pairsOf(node)) {
      const input = inputOf(sink)(key.value, value);
      if (Option.isNone(input)) {
        return out;
      }
      out = Rec.set(out, lowerKey(key), input.value);
    }
    return out;
  };

const secretRequired = (sink: Sink, node: YamlNode): Option.Option<boolean> => {
  if (!isPresent(sink)(node, "mapping", "actionlint.ReusableWorkflowMetadataSecret")) {
    return Option.liftPredicate(false, () => isNull(node));
  }
  let required = false;
  let failed = false;
  const local: Sink = (message) => {
    failed = true;
    sink(message);
  };
  for (const { key, value } of pairsOf(node)) {
    if (key.value === "required") {
      required = decodeBoolean(local)(value);
    }
  }
  return Option.liftPredicate(required, () => !failed);
};

export const secretsOf =
  (sink: Sink) =>
  (node: YamlNode): Secrets => {
    let out: Secrets = {};
    if (isNull(node) || !isMappingOrError(sink)(node, "on.workflow_call.secrets")) {
      return out;
    }
    for (const { key, value } of pairsOf(node)) {
      const required = secretRequired(sink, value);
      if (Option.isNone(required)) {
        return out;
      }
      out = Rec.set(out, lowerKey(key), { name: key.value, required: required.value });
    }
    return out;
  };

export const outputsOf =
  (sink: Sink) =>
  (node: YamlNode): Readonly<Record<string, string>> => {
    if (isNull(node) || !isMappingOrError(sink)(node, "on.workflow_call.outputs")) {
      return {};
    }
    return Rec.fromEntries(
      pipe(
        pairsOf(node),
        Arr.map(({ key }) => [lowerKey(key), key.value] as const),
      ),
    );
  };
