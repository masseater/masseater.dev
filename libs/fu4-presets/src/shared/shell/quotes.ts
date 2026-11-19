import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf, fieldsOf } from "#/shared/syntax/index.ts";

import { basenameOf, commandNameOf, literalOf } from "./command-name.ts";
import { report } from "./finding.ts";
import type { State } from "./finding.ts";
import { ancestors, keywordOf } from "./node.ts";

const QUOTE = 1;
const PATH_DEPTH = 2;
const EXPRESSION = /\$[{(0-9a-zA-Z_]|`[^`]+`/u;
const SED_CONTRA = /\$[{dpsaic](?:$|[^a-zA-Z])/u;
const COMMONLY_QUOTED = new Set(["PS1", "PS2", "PS3", "PS4", "PROMPT_COMMAND"]);
const EXEC_FLAGS = new Set(["-exec", "-execdir"]);
const STATEMENTS = new Set([
  "variable_assignment",
  "test_command",
  "if_statement",
  "while_statement",
  "for_statement",
  "c_style_for_statement",
  "case_statement",
  "subshell",
  "compound_statement",
  "function_definition",
  "unset_command",
  "negated_command",
  "program",
]);
const OK_COMMANDS = new Set([
  "trap",
  "sh",
  "bash",
  "ksh",
  "zsh",
  "ssh",
  "eval",
  "xprop",
  "alias",
  "sudo",
  "docker",
  "podman",
  "dpkg-query",
  "jq",
  "rename",
  "rg",
  "unset",
  "git filter-branch",
  "mumps -run %XCMD",
  "mumps -run LOOP%XCMD",
]);

const literalTexts = (node: SyntaxNode): readonly Option.Option<string>[] =>
  pipe(
    [...Option.toArray(fieldOf("name")(node)), ...fieldsOf("argument")(node)],
    Arr.map(literalOf),
  );

const findCommand = (node: SyntaxNode): string =>
  pipe(
    literalTexts(node),
    Arr.dropWhile((text) => !Option.exists(text, (found) => EXEC_FLAGS.has(found))),
    Arr.get(QUOTE),
    Option.flatten,
    Option.getOrElse(() => "find"),
  );

const prefixed = (node: SyntaxNode, words: readonly string[]): boolean => {
  const texts = literalTexts(node);
  return pipe(
    words,
    Arr.every((word, index) =>
      pipe(
        Arr.get(texts, index),
        Option.flatten,
        Option.exists((text) => text === word),
      ),
    ),
  );
};

const mumpsCommand = (node: SyntaxNode): string => {
  if (prefixed(node, ["mumps", "-run", "%XCMD"])) {
    return "mumps -run %XCMD";
  }
  if (prefixed(node, ["mumps", "-run", "LOOP%XCMD"])) {
    return "mumps -run LOOP%XCMD";
  }
  return "mumps";
};

const commandOf = (node: SyntaxNode): string => {
  const name = pipe(
    commandNameOf(node),
    Option.map(basenameOf),
    Option.getOrElse(() => ""),
  );
  switch (name) {
    case "find": {
      return findCommand(node);
    }
    case "git": {
      if (prefixed(node, ["git", "filter-branch"])) {
        return "git filter-branch";
      }
      return "git";
    }
    case "mumps": {
      return mumpsCommand(node);
    }
    default: {
      return name;
    }
  }
};

const closestCommand = (node: SyntaxNode): string => {
  for (const parent of ancestors(node)) {
    if (parent.type === "command") {
      return commandOf(parent);
    }
    if (parent.type === "declaration_command") {
      return keywordOf(parent);
    }
    if (parent.type === "redirected_statement") {
      return pipe(
        fieldOf("body")(parent),
        Option.filter((body) => body.type === "command"),
        Option.map(commandOf),
        Option.getOrElse(() => ""),
      );
    }
    if (
      STATEMENTS.has(parent.type) &&
      !(
        parent.type === "variable_assignment" &&
        Option.exists(Option.fromNullishOr(parent.parent), (owner) => owner.type === "command")
      )
    ) {
      return "";
    }
  }
  return "";
};

const isOkAssignment = (node: SyntaxNode): boolean =>
  pipe(
    ancestors(node),
    Arr.take(PATH_DEPTH),
    Arr.some(
      (parent) =>
        (parent.type === "variable_assignment" &&
          Option.exists(fieldOf("name")(parent), (name) => COMMONLY_QUOTED.has(name.text))) ||
        (parent.type === "unary_expression" &&
          pipe(
            parent.children,
            Arr.some((child) => child.text === "-v"),
          )),
    ),
  );

const isProbablyOk = (node: SyntaxNode, command: string): boolean =>
  isOkAssignment(node) ||
  OK_COMMANDS.has(command) ||
  Str.endsWith("awk")(command) ||
  Str.startsWith("perl")(command);

export const checkSingleQuoted =
  (state: State) =>
  (node: SyntaxNode): void => {
    const text = Str.slice(QUOTE, -QUOTE)(node.text);
    if (!EXPRESSION.test(text)) {
      return;
    }
    const command = closestCommand(node);
    const quiet =
      (command === "sed" && SED_CONTRA.test(text)) ||
      (command !== "sed" && isProbablyOk(node, command));
    if (!quiet) {
      report({ state, code: "singleQuotedExpression" })(node);
    }
  };
