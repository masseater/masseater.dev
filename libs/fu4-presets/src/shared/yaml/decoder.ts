import type { YamlKind, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { codePoints } from "#/shared/text/index.ts";

import { isNull, isQuoted } from "./node.ts";

export type Sink = (message: string) => void;

const SHOWN = 10;
const TRUE = new Set(["y", "Y", "yes", "Yes", "YES", "on", "On", "ON"]);
const FALSE = new Set(["n", "N", "no", "No", "NO", "off", "Off", "OFF"]);
const TRUE_TAGGED = new Set(["true", "True", "TRUE"]);
const TAGS: Readonly<Record<YamlKind, string>> = {
  mapping: "!!map",
  sequence: "!!seq",
  scalar: "",
  alias: "",
};

const tagOf = (node: YamlNode): string => {
  if (node.kind === "mapping" || node.kind === "sequence") {
    return TAGS[node.kind];
  }
  return node.tag;
};

const shown = (node: YamlNode): string => {
  if (node.kind !== "scalar") {
    return tagOf(node);
  }
  const chars = codePoints(node.value);
  const head = Arr.join(Arr.take(chars, SHOWN), "");
  if (chars.length > SHOWN) {
    return `${node.tag} \`${head} ...\``;
  }
  return `${node.tag} \`${head}\``;
};

export const typeError =
  (sink: Sink) =>
  (node: YamlNode, target: string): void => {
    sink(`line ${String(node.line)}: cannot unmarshal ${shown(node)} into ${target}`);
  };

export const decodeString =
  (sink: Sink) =>
  (node: YamlNode): string => {
    if (node.kind !== "scalar") {
      typeError(sink)(node, "string");
      return "";
    }
    if (isNull(node)) {
      return "";
    }
    return node.value;
  };

export const decodeOptionalString =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<string> =>
    pipe(
      Option.liftPredicate(node, (found) => !isNull(found)),
      Option.map(decodeString(sink)),
    );

const scalarBoolean = (node: YamlNode): Option.Option<boolean> => {
  if (isNull(node)) {
    return Option.some(false);
  }
  if (node.tag === "!!bool") {
    return Option.some(TRUE_TAGGED.has(node.value));
  }
  if (isQuoted(node)) {
    return Option.none();
  }
  if (TRUE.has(node.value)) {
    return Option.some(true);
  }
  return Option.liftPredicate(false, () => FALSE.has(node.value));
};

export const decodeBoolean =
  (sink: Sink) =>
  (node: YamlNode): boolean => {
    const found = pipe(
      Option.liftPredicate(node, (each) => each.kind === "scalar"),
      Option.flatMap(scalarBoolean),
    );
    if (Option.isNone(found)) {
      typeError(sink)(node, "bool");
      return false;
    }
    return found.value;
  };

export const isPresent =
  (sink: Sink) =>
  (node: YamlNode, kind: YamlKind, target: string): boolean => {
    if (isNull(node)) {
      return false;
    }
    if (node.kind !== kind) {
      typeError(sink)(node, target);
      return false;
    }
    return true;
  };

export const isMappingOrError =
  (sink: Sink) =>
  (node: YamlNode, where: string): boolean => {
    if (node.kind === "mapping") {
      return true;
    }
    sink(
      `line ${String(node.line)}: yaml: ${where} must be mapping node but ${node.kind} node was found at line:${String(node.line)}, col:${String(node.column)}`,
    );
    return false;
  };

export const lowerKey = (node: YamlNode): string => Str.toLowerCase(node.value);
