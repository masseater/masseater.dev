import type { SyntaxNode } from "@r_masseater/fu4";
import { Option, String as Str, pipe } from "effect";

import { contextOf } from "./context.ts";
import { report } from "./finding.ts";
import type { State } from "./finding.ts";

const NUMERIC = new Set(["$#", "$?", "$$", "$!", "$-"]);

const isNumeric = (expansion: string): boolean =>
  NUMERIC.has(expansion) || Str.startsWith("${#")(expansion);

const isArray = (expansion: string): boolean =>
  expansion === "$@" || Str.endsWith("[@]}")(expansion);

const wordCode = (
  text: string,
): Option.Option<Extract<ExpansionCode, "unquotedArray" | "unquotedExpansion">> => {
  if (isArray(text)) {
    return Option.some("unquotedArray");
  }
  return pipe(
    Option.some("unquotedExpansion" as const),
    Option.filter(() => !isNumeric(text)),
  );
};

type ExpansionCode =
  | "arithmeticDollar"
  | "unquotedArray"
  | "unquotedArrayElement"
  | "unquotedExpansion";

const expansionCode = (node: SyntaxNode): Option.Option<ExpansionCode> => {
  const context = contextOf(node);
  if (context === "word") {
    return wordCode(node.text);
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
    for (const code of Option.toArray(expansionCode(node))) {
      report({ state, code })(node);
    }
  };

export const checkSubstitution =
  (state: State) =>
  (node: SyntaxNode): void => {
    if (contextOf(node) === "word") {
      report({ state, code: "unquotedSubstitution" })(node);
    }
    if (Str.startsWith("`")(node.text)) {
      report({ state, code: "backticks" })(node);
    }
  };
