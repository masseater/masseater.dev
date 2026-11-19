import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { commandNameOf, effectiveWordOf } from "./command-name.ts";
import { contextOf } from "./context.ts";
import { report } from "./finding.ts";
import type { State } from "./finding.ts";
import { ancestors, parentOf, sameNode } from "./node.ts";

const NUMERIC = new Set(["$#", "$?", "$$", "$!", "$-"]);

const isNumeric = (expansion: string): boolean =>
  NUMERIC.has(expansion) || Str.startsWith("${#")(expansion);

const isArray = (expansion: string): boolean =>
  expansion === "$@" || Str.endsWith("[@]}")(expansion);

const QUOTED_ALTERNATIVE = /^\$\{[^:+]*(?:\[[^\]]*\])?:?\+/u;

const ASSIGNMENT_LIKE = /^\$\{?\w+\}?=/u;
const ESCAPED_QUOTE = String.raw`\"`;
const SPLIT_COMMANDS = new Set(["seq", "pgrep"]);
const ONE = 1;

const wordOf = (node: SyntaxNode): SyntaxNode =>
  pipe(
    parentOf(node),
    Option.filter((parent) => parent.type === "string" && parent.namedChildren.length === ONE),
    Option.getOrElse(() => node),
  );

const usedAsCommandName = (node: SyntaxNode): boolean => {
  const word = wordOf(node);
  const command = pipe(
    parentOf(word),
    Option.flatMap((parent) => {
      if (parent.type === "command_name") {
        return parentOf(parent);
      }
      return Option.some(parent);
    }),
    Option.filter((parent) => parent.type === "command"),
  );
  return pipe(
    command,
    Option.flatMap(effectiveWordOf),
    Option.exists((effective) => effective.id === word.id || effective.id === node.id),
  );
};

const isAssignmentLike = (node: SyntaxNode): boolean =>
  pipe(
    parentOf(node),
    Option.filter(
      (parent) =>
        parent.type === "concatenation" &&
        Option.exists(Arr.head(parent.namedChildren), sameNode(node)) &&
        ASSIGNMENT_LIKE.test(parent.text),
    ),
    Option.flatMap(parentOf),
    Option.exists((parent) => parent.type === "command_name"),
  );

const isInQuotedBackticks = (node: SyntaxNode): boolean =>
  pipe(
    ancestors(node),
    Arr.some(
      (parent) =>
        parent.type === "command_substitution" &&
        Str.startsWith("`")(parent.text) &&
        Option.exists(parentOf(parent), (outer) => outer.type === "string"),
    ),
  );

const isEscapedQuoted = (node: SyntaxNode): boolean =>
  pipe(
    parentOf(node),
    Option.filter((parent) => parent.type === "concatenation"),
    Option.exists((parent) => {
      const siblings = parent.namedChildren;
      const index = Arr.findFirstIndex(siblings, sameNode(node));
      return Option.exists(index, (found) => {
        const before = Arr.get(siblings, found - ONE);
        const after = Arr.get(siblings, found + ONE);
        return (
          Option.exists(before, (sibling) => Str.endsWith(ESCAPED_QUOTE)(sibling.text)) &&
          Option.exists(after, (sibling) => Str.startsWith(ESCAPED_QUOTE)(sibling.text))
        );
      });
    }),
  ) && isInQuotedBackticks(node);

const isCommandName = (node: SyntaxNode): boolean =>
  usedAsCommandName(node) || isAssignmentLike(node) || isEscapedQuoted(node);

const shouldBeSplit = (node: SyntaxNode): boolean =>
  node.namedChildren.length === ONE &&
  pipe(
    Arr.head(node.namedChildren),
    Option.filter((child) => child.type === "command"),
    Option.flatMap(commandNameOf),
    Option.exists((name) => SPLIT_COMMANDS.has(name)),
  );

const isQuiet = (state: State, node: SyntaxNode): boolean =>
  state.cleanReads.has(node.id) || isCommandName(node) || QUOTED_ALTERNATIVE.test(node.text);

const wordCode = (
  state: State,
  node: SyntaxNode,
): Option.Option<Extract<ExpansionCode, "unquotedArray" | "unquotedExpansion">> => {
  if (isArray(node.text)) {
    return Option.some("unquotedArray");
  }
  return pipe(
    Option.some("unquotedExpansion" as const),
    Option.filter(() => !isNumeric(node.text) && !isQuiet(state, node)),
  );
};

type ExpansionCode =
  | "arithmeticDollar"
  | "unquotedArray"
  | "unquotedArrayElement"
  | "unquotedExpansion";

const expansionCode = (state: State, node: SyntaxNode): Option.Option<ExpansionCode> => {
  const context = contextOf(node);
  if (context === "word") {
    return wordCode(state, node);
  }
  if (context === "array") {
    return Option.some("unquotedArrayElement" as const);
  }
  const arithmetic =
    context === "arithmetic" && node.type === "simple_expansion" && !isNumeric(node.text);
  return pipe(
    Option.some("arithmeticDollar" as const),
    Option.filter(() => arithmetic),
  );
};

export const checkExpansion =
  (state: State) =>
  (node: SyntaxNode): void => {
    for (const code of Option.toArray(expansionCode(state, node))) {
      report({ state, code })(node);
    }
  };

export const checkSubstitution =
  (state: State) =>
  (node: SyntaxNode): void => {
    if (contextOf(node) === "word" && !usedAsCommandName(node) && !shouldBeSplit(node)) {
      report({ state, code: "unquotedSubstitution" })(node);
    }
    if (Str.startsWith("`")(node.text)) {
      report({ state, code: "backticks" })(node);
    }
  };
