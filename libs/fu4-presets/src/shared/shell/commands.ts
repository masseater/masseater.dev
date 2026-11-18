import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf, fieldsOf } from "#/shared/syntax/index.ts";

import { report } from "./finding.ts";
import type { State } from "./finding.ts";
import { firstNamed, parentOf, sameNode } from "./node.ts";

const SINGLE = 1;
const QUOTES = 2;
const COMPARISONS = new Set(["test", "expr"]);

interface Command {
  readonly node: SyntaxNode;
  readonly name: Option.Option<SyntaxNode>;
  readonly arguments: readonly SyntaxNode[];
}

const nameText = (command: Command): string =>
  pipe(
    command.name,
    Option.map((name) => name.text),
    Option.getOrElse(() => ""),
  );

const onlyArgument = (command: Command): Option.Option<SyntaxNode> =>
  pipe(
    Arr.head(command.arguments),
    Option.filter(() => command.arguments.length === SINGLE),
  );

const checkTrailingDot = (state: State, command: Command): void => {
  const name = nameText(command);
  const dotted = pipe(
    command.name,
    Option.filter((node) => Option.exists(firstNamed(node), (word) => word.type === "word")),
    Option.filter(() => name.length > SINGLE && Str.endsWith(".")(name)),
  );
  for (const node of Option.toArray(dotted)) {
    report({ state, code: "trailingDot" })(node);
  }
};

const checkSpacedAssignment = (state: State, command: Command): void => {
  const first = pipe(
    Arr.head(command.arguments),
    Option.filter((node) => node.text === "=" && node.type === "word"),
    Option.filter(() => Option.isSome(command.name) && !COMPARISONS.has(nameText(command))),
  );
  for (const node of Option.toArray(first)) {
    report({ state, code: "spacedAssignment" })(node);
  }
};

const isQuotedSubstitution = (node: SyntaxNode): boolean =>
  node.type === "string" &&
  node.namedChildren.length === SINGLE &&
  Option.exists(
    firstNamed(node),
    (child) =>
      child.type === "command_substitution" && node.text.length === child.text.length + QUOTES,
  );

const checkUselessEcho = (state: State, command: Command): void => {
  const only = pipe(
    onlyArgument(command),
    Option.filter(() => nameText(command) === "echo"),
    Option.filter((node) => node.type === "command_substitution" || isQuotedSubstitution(node)),
  );
  for (const node of Option.toArray(only)) {
    report({ state, code: "uselessEcho" })(node);
  }
};

const startsPipeline = (node: SyntaxNode): boolean =>
  Option.exists(
    parentOf(node),
    (parent) => parent.type === "pipeline" && Option.exists(firstNamed(parent), sameNode(node)),
  );

const checkUselessCat = (state: State, command: Command): void => {
  const only = pipe(
    onlyArgument(command),
    Option.filter(() => nameText(command) === "cat" && startsPipeline(command.node)),
    Option.filter((node) => node.type === "word" && !Str.startsWith("-")(node.text)),
  );
  for (const node of Option.toArray(only)) {
    report({ state, code: "uselessCat" })(node);
  }
};

export const checkCommand =
  (state: State) =>
  (node: SyntaxNode): void => {
    const command: Command = {
      node,
      name: fieldOf("name")(node),
      arguments: fieldsOf("argument")(node),
    };
    checkTrailingDot(state, command);
    checkSpacedAssignment(state, command);
    checkUselessEcho(state, command);
    checkUselessCat(state, command);
  };
