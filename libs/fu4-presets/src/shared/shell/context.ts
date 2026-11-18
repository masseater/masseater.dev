import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { ancestors } from "./node.ts";

export type Context = "arithmetic" | "array" | "quiet" | "word";

const CONTEXTS: Readonly<Record<string, Context>> = {
  string: "quiet",
  heredoc_body: "quiet",
  variable_assignments: "quiet",
  declaration_command: "quiet",
  case_statement: "quiet",
  for_statement: "quiet",
  subscript: "quiet",
  expansion: "quiet",
  variable_assignment: "quiet",
  arithmetic_expansion: "arithmetic",
  array: "array",
  command: "word",
  file_redirect: "word",
  herestring_redirect: "word",
};

const testContext = (node: SyntaxNode): Context => {
  if (Str.startsWith("[[")(node.text)) {
    return "quiet";
  }
  return "word";
};

const contextAt = (node: SyntaxNode): Option.Option<Context> => {
  if (node.type === "test_command") {
    return Option.some(testContext(node));
  }
  return Rec.get(CONTEXTS, node.type);
};

export const contextOf = (node: SyntaxNode): Context =>
  pipe(
    ancestors(node),
    Arr.findFirst(contextAt),
    Option.getOrElse((): Context => "quiet"),
  );
