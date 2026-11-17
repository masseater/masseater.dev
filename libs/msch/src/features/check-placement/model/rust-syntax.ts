import { Array as Arr, Option, pipe } from "effect";

import type { SyntaxNode } from "#/shared/lib/tree-sitter.ts";

export interface RustPath {
  readonly segments: readonly string[];
  readonly scope: readonly string[];
  readonly line: number;
  readonly column: number;
}

export interface RustItem {
  readonly kind: string;
  readonly name: Option.Option<string>;
  readonly inline: boolean;
  readonly visible: boolean;
  readonly line: number;
  readonly column: number;
}

export interface RustFile {
  readonly paths: readonly RustPath[];
  readonly items: readonly RustItem[];
  readonly replacesAllocator: boolean;
}

const ANCHORS: readonly string[] = ["crate", "super", "self"];
const SCOPED: readonly string[] = ["scoped_identifier", "scoped_type_identifier"];
const IGNORED_ITEMS: readonly string[] = ["line_comment", "block_comment"];
const PATH_SEPARATOR = "::";
const SELF = "self";
const NEXT = 1;
const ALLOCATOR = "global_allocator";

const field = (node: SyntaxNode, name: string): Option.Option<SyntaxNode> =>
  Option.fromNullishOr(node.childForFieldName(name));

const namedChildren = (node: SyntaxNode): readonly SyntaxNode[] =>
  pipe(
    node.namedChildren,
    Arr.flatMap((child) => Option.toArray(Option.fromNullishOr(child))),
  );

const sameNode = (left: Option.Option<SyntaxNode>, right: SyntaxNode): boolean =>
  Option.exists(left, (node) => node.id === right.id);

const segmentsOf = (node: SyntaxNode): readonly string[] => {
  if (Arr.contains(SCOPED, node.type)) {
    return [
      ...Option.match(field(node, "path"), { onNone: () => [], onSome: segmentsOf }),
      ...Option.match(field(node, "name"), { onNone: () => [], onSome: (name) => [name.text] }),
    ];
  }
  if (node.type === "generic_type") {
    return Option.match(field(node, "type"), { onNone: () => [], onSome: segmentsOf });
  }
  return [node.text];
};

const extendsPath = (parent: SyntaxNode, node: SyntaxNode): boolean =>
  (Arr.contains(SCOPED, parent.type) && sameNode(field(parent, "path"), node)) ||
  (parent.type === "generic_type" && sameNode(field(parent, "type"), node));

const outermostPath = (node: SyntaxNode): SyntaxNode =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.filter((parent) => extendsPath(parent, node)),
    Option.match({ onNone: () => node, onSome: outermostPath }),
  );

const tokenSegments = (node: SyntaxNode): readonly string[] =>
  pipe(
    Option.fromNullishOr(node.nextSibling),
    Option.filter((separator) => separator.type === PATH_SEPARATOR),
    Option.flatMap((separator) => Option.fromNullishOr(separator.nextSibling)),
    Option.filter((next) => next.type === "identifier" || Arr.contains(ANCHORS, next.type)),
    Option.match({
      onNone: (): readonly string[] => [node.text],
      onSome: (next) => [node.text, ...tokenSegments(next)],
    }),
  );

const ancestors = (node: SyntaxNode): readonly SyntaxNode[] =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.match({
      onNone: (): readonly SyntaxNode[] => [],
      onSome: (parent) => [parent, ...ancestors(parent)],
    }),
  );

const scopeOf = (node: SyntaxNode): readonly string[] =>
  pipe(
    ancestors(node),
    Arr.filter((ancestor) => ancestor.type === "mod_item"),
    Arr.flatMap((module) => Option.toArray(field(module, "name"))),
    Arr.map((name) => name.text),
    Arr.reverse,
  );

const pathAt = (node: SyntaxNode, segments: readonly string[]): RustPath => ({
  segments,
  scope: scopeOf(node),
  line: node.startPosition.row + NEXT,
  column: node.startPosition.column + NEXT,
});

const insideAny = (node: SyntaxNode, kinds: readonly string[]): boolean =>
  Arr.some(ancestors(node), (ancestor) => Arr.contains(kinds, ancestor.type));

const anchoredPaths = (root: SyntaxNode): readonly RustPath[] =>
  pipe(
    root.descendantsOfType([...ANCHORS]),
    Arr.flatMap((node) => Option.toArray(Option.fromNullishOr(node))),
    Arr.filter((node) => !insideAny(node, ["use_declaration", "visibility_modifier"])),
    Arr.map((node) => {
      if (
        Option.exists(Option.fromNullishOr(node.parent), (parent) => parent.type === "token_tree")
      ) {
        return pathAt(node, tokenSegments(node));
      }
      const outer = outermostPath(node);
      return pathAt(node, segmentsOf(outer));
    }),
  );

const joined = (prefix: readonly string[], node: SyntaxNode): readonly string[] => {
  const own = segmentsOf(node);
  if (
    own.length === NEXT &&
    Option.contains(Arr.head(own), SELF) &&
    Arr.isReadonlyArrayNonEmpty(prefix)
  ) {
    return prefix;
  }
  return [...prefix, ...own];
};

const treesOfUse = (
  prefix: readonly string[],
  node: SyntaxNode,
): readonly (readonly string[])[] => {
  switch (node.type) {
    case "scoped_use_list": {
      const base = Option.match(field(node, "path"), {
        onNone: () => prefix,
        onSome: (path) => joined(prefix, path),
      });
      return Option.match(field(node, "list"), {
        onNone: () => [base],
        onSome: (list) => treesOfUse(base, list),
      });
    }
    case "use_list": {
      return Arr.flatMap(namedChildren(node), (child) => treesOfUse(prefix, child));
    }
    case "use_as_clause": {
      return Option.match(field(node, "path"), {
        onNone: () => [],
        onSome: (path) => [joined(prefix, path)],
      });
    }
    case "use_wildcard": {
      return pipe(
        Arr.head(namedChildren(node)),
        Option.match({ onNone: () => [prefix], onSome: (path) => [joined(prefix, path)] }),
      );
    }
    default: {
      return [joined(prefix, node)];
    }
  }
};

const importedPaths = (root: SyntaxNode): readonly RustPath[] =>
  pipe(
    root.descendantsOfType("use_declaration"),
    Arr.flatMap((node) => Option.toArray(Option.fromNullishOr(node))),
    Arr.flatMap((declaration) =>
      pipe(
        field(declaration, "argument"),
        Option.match({
          onNone: () => [],
          onSome: (argument) =>
            Arr.map(treesOfUse([], argument), (segments) => pathAt(declaration, segments)),
        }),
      ),
    ),
    Arr.filter(({ segments }) =>
      Option.exists(Arr.head(segments), (first) => Arr.contains(ANCHORS, first)),
    ),
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
  paths: [...importedPaths(root), ...anchoredPaths(root)],
  items: pipe(
    namedChildren(root),
    Arr.filter((node) => !Arr.contains(IGNORED_ITEMS, node.type)),
    Arr.map(itemOf),
  ),
  replacesAllocator: replacesAllocator(root),
});
