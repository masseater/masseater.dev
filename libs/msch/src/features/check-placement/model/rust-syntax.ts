import { Array as Arr, Option, pipe } from "effect";

import type { SyntaxNode } from "#/shared/lib/tree-sitter.ts";

export interface RustItem {
  readonly kind: string;
  readonly name: Option.Option<string>;
  readonly inline: boolean;
  readonly visible: boolean;
  readonly line: number;
  readonly column: number;
}

export interface RustFile {
  readonly items: readonly RustItem[];
  readonly replacesAllocator: boolean;
}

const IGNORED_ITEMS: readonly string[] = ["line_comment", "block_comment"];
const NEXT = 1;
const ALLOCATOR = "global_allocator";

const field = (node: SyntaxNode, name: string): Option.Option<SyntaxNode> =>
  Option.fromNullishOr(node.childForFieldName(name));

const namedChildren = (node: SyntaxNode): readonly SyntaxNode[] =>
  pipe(
    node.namedChildren,
    Arr.flatMap((child) => Option.toArray(Option.fromNullishOr(child))),
  );

const itemOf = (node: SyntaxNode): RustItem => ({
  kind: node.type,
  name: Option.map(field(node, "name"), (name) => name.text),
  inline: Option.isSome(field(node, "body")),
  visible: Arr.some(namedChildren(node), (child) => child.type === "visibility_modifier"),
  line: node.startPosition.row + NEXT,
  column: node.startPosition.column + NEXT,
});

const replacesAllocator = (root: SyntaxNode): boolean =>
  pipe(
    root.descendantsOfType("attribute"),
    Arr.flatMap((node) => Option.toArray(Option.fromNullishOr(node))),
    Arr.some((attribute) =>
      Option.exists(Arr.head(namedChildren(attribute)), (name) => name.text === ALLOCATOR),
    ),
  );

export const readRustFile = (root: SyntaxNode): RustFile => ({
  items: pipe(
    namedChildren(root),
    Arr.filter((node) => !Arr.contains(IGNORED_ITEMS, node.type)),
    Arr.map(itemOf),
  ),
  replacesAllocator: replacesAllocator(root),
});
