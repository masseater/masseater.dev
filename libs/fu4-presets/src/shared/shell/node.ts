import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

export const parentOf = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  Option.fromNullishOr(node.parent);

export const firstNamed = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  Arr.head(node.namedChildren);

export const sameNode =
  (node: SyntaxNode) =>
  (other: SyntaxNode): boolean =>
    other.id === node.id;

const isMissingName = (node: SyntaxNode): boolean =>
  node.isMissing &&
  Option.exists(
    parentOf(node),
    (parent) =>
      parent.type === "command_name" &&
      Option.exists(parentOf(parent), (command) =>
        pipe(
          command.namedChildren,
          Arr.some((child) => child.type === "variable_assignment"),
        ),
      ),
  );

export const hasError = (node: SyntaxNode): boolean =>
  node.isError ||
  (node.isMissing && !isMissingName(node)) ||
  pipe(node.children, Arr.some(hasError));

export const ancestors = (node: SyntaxNode): readonly SyntaxNode[] => {
  const found: SyntaxNode[] = [];
  for (let current = parentOf(node); Option.isSome(current); current = parentOf(current.value)) {
    found.push(current.value);
  }
  return found;
};

export const keywordOf = (node: SyntaxNode): string =>
  pipe(
    Arr.head(node.children),
    Option.map((child) => child.text),
    Option.getOrElse(() => ""),
  );
