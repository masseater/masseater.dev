import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

export const descendants = (node: SyntaxNode): readonly SyntaxNode[] =>
  Arr.prepend(pipe(node.children, Arr.flatMap(descendants)), node);

export const fieldOf =
  (field: string) =>
  (node: SyntaxNode): Option.Option<SyntaxNode> =>
    pipe(
      node.children,
      Arr.findFirst((child) => child.field === field),
    );

export const fieldsOf =
  (field: string) =>
  (node: SyntaxNode): readonly SyntaxNode[] =>
    pipe(
      node.children,
      Arr.filter((child) => child.field === field),
    );

export const isType =
  (...types: readonly string[]) =>
  (node: SyntaxNode): boolean =>
    types.includes(node.type);

export const namedOfType =
  (...types: readonly string[]) =>
  (node: SyntaxNode): readonly SyntaxNode[] =>
    pipe(node.namedChildren, Arr.filter(isType(...types)));

export const ofType =
  (...types: readonly string[]) =>
  (node: Option.Option<SyntaxNode>): Option.Option<SyntaxNode> =>
    pipe(node, Option.filter(isType(...types)));
