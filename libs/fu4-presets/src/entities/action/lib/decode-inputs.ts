import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { ActionInput } from "#/entities/action/model/types.ts";
import { quote } from "#/shared/text/index.ts";
import {
  custom,
  decodeBoolean,
  decodeString,
  isMappingOrError,
  lowerKey,
  typeError,
} from "#/shared/yaml/decoder.ts";
import type { Sink } from "#/shared/yaml/decoder.ts";
import { isNull, pairsOf, valueAt } from "#/shared/yaml/index.ts";
import type { Pair } from "#/shared/yaml/index.ts";

type Inputs = Readonly<Record<string, ActionInput>>;

interface Fields {
  readonly required: boolean;
  readonly defaulted: boolean;
  readonly message: string;
}

const KNOWN_KEYS: readonly string[] = ["description", "required", "default"];
const DEPRECATION = "deprecationMessage";

const defaulted = (sink: Sink, node: YamlNode): boolean => {
  if (node.kind !== "scalar") {
    typeError(sink)(node, "string");
  }
  return !isNull(node);
};

const fieldsOf = (sink: Sink, node: YamlNode): Fields => ({
  required: Option.match(valueAt("required")(node), {
    onNone: () => false,
    onSome: decodeBoolean(sink),
  }),
  defaulted: Option.exists(valueAt("default")(node), (value) => defaulted(sink, value)),
  message: Option.match(valueAt(DEPRECATION)(node), {
    onNone: () => "",
    onSome: decodeString(sink),
  }),
});

const fieldsFor = (sink: Sink, node: YamlNode): Option.Option<Fields> => {
  if (isNull(node)) {
    return Option.some({ required: false, defaulted: false, message: "" });
  }
  if (node.kind !== "mapping") {
    typeError(sink)(node, "actionlint.actionInputMetadata");
    return Option.none();
  }
  let failed = false;
  const fields = fieldsOf((message) => {
    failed = true;
    sink(message);
  }, node);
  return Option.liftPredicate(fields, () => !failed);
};

const keysOf = (node: YamlNode): readonly string[] => {
  if (node.kind !== "mapping") {
    return [];
  }
  return pipe(
    pairsOf(node),
    Arr.map((pair) => pair.key.value),
  );
};

const unexpectedOf = (name: string, node: YamlNode): Option.Option<string> =>
  pipe(
    keysOf(node),
    Arr.filter((key) => key !== DEPRECATION && !Arr.contains(KNOWN_KEYS, key)),
    Arr.last,
    Option.map((key) => `unexpected key ${quote(key)} for definition of input ${quote(name)}`),
  );

const inputOf = (name: string, node: YamlNode, fields: Fields): ActionInput => ({
  name,
  required: fields.required && !fields.defaulted,
  deprecated: Arr.contains(keysOf(node), DEPRECATION),
  deprecationMessage: Str.trim(fields.message),
});

interface Progress {
  readonly inputs: Inputs;
  readonly unexpected: Option.Option<string>;
  readonly done: boolean;
}

const INITIAL: Progress = { inputs: {}, unexpected: Option.none(), done: false };

const advance =
  (sink: Sink, node: YamlNode) =>
  (progress: Progress, pair: Pair): Progress => {
    const fields = fieldsFor(sink, pair.value);
    if (Option.isNone(fields)) {
      return { ...progress, done: true };
    }
    const id = lowerKey(pair.key);
    if (Rec.has(progress.inputs, id)) {
      custom(sink)(node, `input ${quote(pair.key.value)} is duplicated`);
      return { ...progress, done: true };
    }
    const previous = progress.unexpected;
    return {
      inputs: Rec.set(progress.inputs, id, inputOf(pair.key.value, pair.value, fields.value)),
      unexpected: Option.orElse(unexpectedOf(pair.key.value, pair.value), () => previous),
      done: false,
    };
  };

const progressOf = (sink: Sink, node: YamlNode): Progress => {
  const advanceWith = advance(sink, node);
  let progress = INITIAL;
  for (const pair of pairsOf(node)) {
    if (!progress.done) {
      progress = advanceWith(progress, pair);
    }
  }
  return progress;
};

export const decodeInputs =
  (sink: Sink) =>
  (node: YamlNode): Inputs => {
    if (isNull(node) || !isMappingOrError(sink)(node, "inputs")) {
      return {};
    }
    const progress = progressOf(sink, node);
    const unexpected = pipe(
      progress.unexpected,
      Option.filter(() => !progress.done),
    );
    for (const message of Option.toArray(unexpected)) {
      custom(sink)(node, message);
    }
    return progress.inputs;
  };

export const decodeOutputs =
  (sink: Sink) =>
  (node: YamlNode): Readonly<Record<string, string>> => {
    let outputs: Readonly<Record<string, string>> = {};
    if (isNull(node) || !isMappingOrError(sink)(node, "outputs")) {
      return outputs;
    }
    for (const { key } of pairsOf(node)) {
      if (Rec.has(outputs, lowerKey(key))) {
        custom(sink)(node, `output ${quote(key.value)} is duplicated`);
        return outputs;
      }
      outputs = Rec.set(outputs, lowerKey(key), key.value);
    }
    return outputs;
  };
