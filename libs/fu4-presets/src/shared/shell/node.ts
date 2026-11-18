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

export const hasError = (node: SyntaxNode): boolean =>
  node.isError || node.isMissing || pipe(node.children, Arr.some(hasError));

export const ancestors = (node: SyntaxNode): readonly SyntaxNode[] => {
  const found: SyntaxNode[] = [];
  for (let current = parentOf(node); Option.isSome(current); current = parentOf(current.value)) {
    found.push(current.value);
  }
  return found;
};
