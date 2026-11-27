import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf } from "#/shared/syntax/index.ts";

import { appendAll, valueOf } from "./scope.ts";
import type { Scope, Status } from "./scope.ts";

const SPACEFUL = /[ \t\n*?[]/u;
const WORD_ESCAPE = /\\(?<char>.)/gsu;
const STRING_ESCAPE = /\\(?<char>[$`"\\\n])/gu;
const NAMES = new Set(["variable_name", "special_variable_name"]);
const QUOTE = 1;

export const literalStatus = (text: string): Status => {
  if (Str.isEmpty(text)) {
    return "empty";
  }
  if (SPACEFUL.test(text)) {
    return "dirty";
  }
  return "clean";
};

const nameOfChild = (child: SyntaxNode): Option.Option<string> => {
  if (NAMES.has(child.type)) {
    return Option.some(child.text);
  }
  if (child.type === "subscript") {
    return pipe(
      fieldOf("name")(child),
      Option.map((name) => name.text),
    );
  }
  return Option.none();
};

export const variableOf = (node: SyntaxNode): Option.Option<string> =>
  pipe(node.namedChildren, Arr.findFirst(nameOfChild));

const isUnmodified = (node: SyntaxNode, name: string): boolean =>
  node.type === "simple_expansion" || node.text === `\${${name}}`;

const variableStatus = (scope: Scope, node: SyntaxNode): Status =>
  pipe(
    variableOf(node),
    Option.filter((name) => isUnmodified(node, name)),
    Option.match({
      onNone: (): Status => "dirty",
      onSome: (name) => valueOf(name)(scope),
    }),
  );

type Rate = (scope: Scope, node: SyntaxNode) => Status;

const wordStatus: Rate = (_scope, node) =>
  literalStatus(Str.replaceAll(WORD_ESCAPE, "$<char>")(node.text));

const RATES: ReadonlyMap<string, Rate> = new Map<string, Rate>([
  ["word", wordStatus],
  ["number", wordStatus],
  ["raw_string", (_scope, node): Status => literalStatus(Str.slice(QUOTE, -QUOTE)(node.text))],
  [
    "string_content",
    (_scope, node): Status => literalStatus(Str.replaceAll(STRING_ESCAPE, "$<char>")(node.text)),
  ],
  ["simple_expansion", variableStatus],
  ["expansion", variableStatus],
  ["arithmetic_expansion", (): Status => "clean"],
]);

const PARTS = new Set(["string", "concatenation"]);

const rated = (scope: Scope, node: SyntaxNode): Status =>
  pipe(
    Option.fromNullishOr(RATES.get(node.type)),
    Option.match({
      onNone: (): Status => "dirty",
      onSome: (rate) => rate(scope, node),
    }),
  );

export const valueStatus =
  (scope: Scope) =>
  (node: SyntaxNode): Status => {
    if (PARTS.has(node.type)) {
      const partStatus = valueStatus(scope);
      return appendAll(pipe(node.namedChildren, Arr.map(partStatus)));
    }
    return rated(scope, node);
  };

export const isCleanRead =
  (scope: Scope) =>
  (node: SyntaxNode): boolean =>
    pipe(
      variableOf(node),
      Option.exists((name) => valueOf(name)(scope) === "clean"),
    );
