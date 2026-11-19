import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf, fieldsOf } from "#/shared/syntax/index.ts";

import { report } from "./finding.ts";
import type { State } from "./finding.ts";

const MINIMUM_APPENDS = 3;
const NEXT = 1;
const CLAUSES = new Set(["elif_clause", "else_clause"]);
const BLOCKS = new Set([
  "program",
  "compound_statement",
  "subshell",
  "do_group",
  "command_substitution",
  "else_clause",
]);
const LS_SINKS = new Set(["grep", "xargs"]);

const statementsOf = (nodes: readonly SyntaxNode[]): readonly SyntaxNode[] =>
  pipe(
    nodes,
    Arr.filter((node) => node.named && node.type !== "comment" && !CLAUSES.has(node.type)),
  );

const splitAtThen = (node: SyntaxNode): readonly (readonly SyntaxNode[])[] => {
  const index = Arr.findFirstIndex(node.children, (child) => !child.named && child.type === "then");
  return Option.match(index, {
    onNone: () => [statementsOf(node.children)],
    onSome: (found) => [
      statementsOf(Arr.take(node.children, found)),
      statementsOf(Arr.drop(node.children, found + NEXT)),
    ],
  });
};

const sequencesOf = (node: SyntaxNode): readonly (readonly SyntaxNode[])[] => {
  if (BLOCKS.has(node.type)) {
    return [statementsOf(node.children)];
  }
  if (node.type === "if_statement" || node.type === "elif_clause") {
    return splitAtThen(node);
  }
  if (node.type === "while_statement") {
    return [fieldsOf("condition")(node)];
  }
  return [];
};

const isAppend = (redirect: SyntaxNode): boolean =>
  redirect.type === "file_redirect" &&
  pipe(
    redirect.children,
    Arr.some((child) => !child.named && child.type === ">>"),
  );

interface Target {
  readonly file: string;
  readonly at: SyntaxNode;
}

const targetOf = (node: SyntaxNode): Option.Option<Target> => {
  if (node.type === "pipeline") {
    return pipe(Arr.last(statementsOf(node.children)), Option.flatMap(targetOf));
  }
  if (node.type !== "redirected_statement") {
    return Option.none();
  }
  return pipe(
    fieldsOf("redirect")(node),
    Arr.findFirst(isAppend),
    Option.flatMap(fieldOf("destination")),
    Option.map((file) => ({ file: file.text, at: node })),
  );
};

const sameFile = (left: Option.Option<Target>, right: Option.Option<Target>): boolean =>
  Option.isSome(left) && Option.isSome(right) && left.value.file === right.value.file;

const appendGroups = (statements: readonly SyntaxNode[]): readonly SyntaxNode[] => {
  const targets = pipe(statements, Arr.map(targetOf));
  if (!Arr.isReadonlyArrayNonEmpty(targets)) {
    return [];
  }
  return pipe(
    targets,
    Arr.groupWith(sameFile),
    Arr.filter((group) => group.length >= MINIMUM_APPENDS),
    Arr.flatMap((group) => Option.toArray(Arr.headNonEmpty(group))),
    Arr.map((target) => target.at),
  );
};

export const checkSequence =
  (state: State) =>
  (node: SyntaxNode): void => {
    for (const statements of sequencesOf(node)) {
      for (const at of appendGroups(statements)) {
        report({ state, code: "multipleAppends" })(at);
      }
    }
  };

const isInExpansion = (node: SyntaxNode): boolean =>
  Option.exists(
    Option.fromNullishOr(node.parent),
    (parent) =>
      parent.type === "command_substitution" && statementsOf(parent.children).length === NEXT,
  );

export const checkRedirect =
  (state: State) =>
  (node: SyntaxNode): void => {
    const dangling =
      Option.isNone(fieldOf("body")(node)) &&
      !Option.exists(Option.fromNullishOr(node.parent), (parent) => parent.type === "pipeline") &&
      !isInExpansion(node);
    if (!dangling) {
      return;
    }
    for (const redirect of Option.toArray(Arr.head(fieldsOf("redirect")(node)))) {
      report({ state, code: "redirectedNowhere" })(redirect);
    }
  };

const commandOf = (node: SyntaxNode): Option.Option<SyntaxNode> => {
  if (node.type === "command") {
    return Option.some(node);
  }
  if (node.type === "redirected_statement") {
    return pipe(fieldOf("body")(node), Option.flatMap(commandOf));
  }
  return Option.none();
};

const firstWordOf = (node: SyntaxNode): string =>
  pipe(
    commandOf(node),
    Option.flatMap(fieldOf("name")),
    Option.map((name) => name.text),
    Option.getOrElse(() => ""),
  );

const hasNoSort = (node: SyntaxNode): boolean =>
  pipe(
    commandOf(node),
    Option.map(fieldsOf("argument")),
    Option.exists(Arr.some((arg) => Str.startsWith("-")(arg.text) && Str.includes("N")(arg.text))),
  );

export const checkPipeline =
  (state: State) =>
  (node: SyntaxNode): void => {
    const elements = statementsOf(node.children);
    const words = pipe(elements, Arr.map(firstWordOf));
    const pairs = Arr.zip(words, Arr.drop(words, NEXT));
    const piped = pipe(
      pairs,
      Arr.some(([left, right]) => left === "ls" && LS_SINKS.has(right)),
    );
    if (piped) {
      return;
    }
    const listed = pipe(
      Arr.zip(elements, Arr.drop(words, NEXT)),
      Arr.filter(([element]) => firstWordOf(element) === "ls" && !hasNoSort(element)),
    );
    for (const [element] of listed) {
      report({ state, code: "lsInPipeline" })(element);
    }
  };
