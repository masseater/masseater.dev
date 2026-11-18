import type { YamlNode } from "@r_masseater/fu4";
import { Option, Predicate, pipe } from "effect";

import type { Bool, Float, Int } from "#/entities/workflow/model/types.ts";
import { optional } from "#/shared/record/index.ts";
import { atoi, goFloat, parseGoFloat, quote } from "#/shared/text/index.ts";
import { textOf } from "#/shared/yaml/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { isExpressionAssigned } from "./expression-text.ts";
import type { Sink } from "./sink.ts";

const ZERO = 0;
const FLOAT_TAGS = new Set(["!!float", "!!int", "!!str"]);

const nodeShape = (node: YamlNode): string => `${node.kind} node with ${quote(node.tag)} tag`;

const emptyText = (node: YamlNode): Text => ({
  value: "",
  quoted: false,
  line: node.line,
  column: node.column,
});

export const checkString =
  (sink: Sink) =>
  (node: YamlNode, allowEmpty: boolean): boolean => {
    if (node.kind !== "scalar") {
      sink.error(node, `expected scalar node for string value but found ${nodeShape(node)}`);
      return false;
    }
    if (!allowEmpty && node.value === "") {
      sink.error(node, "string should not be empty");
      return false;
    }
    return true;
  };

export const parseString =
  (sink: Sink) =>
  (node: YamlNode, allowEmpty: boolean): Text => {
    if (!checkString(sink)(node, allowEmpty)) {
      return emptyText(node);
    }
    return textOf(node);
  };

export const parseExpression =
  (sink: Sink) =>
  (node: YamlNode, expecting: string): Option.Option<Text> => {
    if (!isExpressionAssigned(node.value)) {
      sink.error(
        node,
        `expecting a single \${{...}} expression or ${expecting}, but found plain text node`,
      );
      return Option.none();
    }
    return Option.some(textOf(node));
  };

export const mayParseExpression = (node: YamlNode): Option.Option<Text> =>
  pipe(
    Option.liftPredicate(
      node,
      (value) => value.tag === "!!str" && isExpressionAssigned(value.value),
    ),
    Option.map(textOf),
  );

export const parseBool =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<Bool> => {
    if (node.kind !== "scalar" || (node.tag !== "!!bool" && node.tag !== "!!str")) {
      sink.error(node, `expected bool value but found ${nodeShape(node)}`);
      return Option.none();
    }
    const at = { line: node.line, column: node.column };
    if (node.tag === "!!str") {
      const expression = parseExpression(sink)(node, 'boolean literal "true" or "false"');
      return Option.some({ ...at, value: false, ...optional("expression")(expression) });
    }
    return Option.some({ ...at, value: node.value === "true" });
  };

const fromExpression = (expression: Option.Option<Text>): Option.Option<Int> =>
  pipe(
    expression,
    Option.map((text): Int => ({ value: ZERO, expression: text })),
  );

const integerLiteral =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<Int> => {
    const parsed = atoi(node.value);
    if (typeof parsed === "string") {
      const shown = quote(node.value);
      sink.error(
        node,
        `invalid integer value: ${shown}: strconv.Atoi: parsing ${shown}: ${parsed}`,
      );
      return Option.none();
    }
    return Option.some({ value: parsed });
  };

export const parseInteger =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<Int> => {
    if (node.kind !== "scalar" || (node.tag !== "!!int" && node.tag !== "!!str")) {
      sink.error(node, `expected scalar node for integer value but found ${nodeShape(node)}`);
      return Option.none();
    }
    if (node.tag === "!!str") {
      return fromExpression(parseExpression(sink)(node, "integer literal"));
    }
    return integerLiteral(sink)(node);
  };

export const parseNumber =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<Float> => {
    if (node.kind !== "scalar" || !FLOAT_TAGS.has(node.tag)) {
      sink.error(node, `expected scalar node for float value but found ${nodeShape(node)}`);
      return Option.none();
    }
    if (node.tag === "!!str") {
      return fromExpression(parseExpression(sink)(node, "float number literal"));
    }
    const parsed = pipe(
      parseGoFloat(node.value),
      Option.filter((value) => !Number.isNaN(value)),
    );
    if (Option.isNone(parsed)) {
      const shown = quote(node.value);
      sink.error(
        node,
        `invalid float value: ${shown}: strconv.ParseFloat: parsing ${shown}: invalid syntax`,
      );
    }
    return pipe(
      parsed,
      Option.map((value): Float => ({ value })),
    );
  };

export const parseTimeoutMinutes =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<Float> => {
    const parsed = parseNumber(sink)(node);
    if (
      Option.isSome(parsed) &&
      Predicate.isUndefined(parsed.value.expression) &&
      parsed.value.value <= ZERO
    ) {
      sink.error(
        node,
        `value at "timeout-minutes" must be greater than zero: ${goFloat(parsed.value.value)}`,
      );
    }
    return parsed;
  };
