import type { Source, SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { descendants, isAnchor, isComment, isContainer, namedWhere, parentOf } from "./nodes.ts";

const NONE = 0;
const NAME_START = 1;
const encoder = new TextEncoder();

export interface Anchor {
  readonly name: string;
  readonly start: number;
  readonly target: SyntaxNode;
}

export interface Point {
  readonly row: number;
  readonly column: number;
}

export interface Document {
  readonly text: string;
  readonly root: SyntaxNode;
  readonly top: SyntaxNode;
  readonly anchors: readonly Anchor[];
  readonly lineStarts: readonly number[];
}

const anchorOf = (anchor: SyntaxNode): Option.Option<Anchor> =>
  pipe(
    parentOf(anchor),
    Option.flatMap(namedWhere((child) => !isAnchor(child) && !isComment(child))),
    Option.map((target) => ({
      name: Str.slice(NAME_START)(anchor.text),
      start: anchor.start,
      target,
    })),
  );

const lineStartsOf = (text: string): readonly number[] => {
  const starts = [NONE];
  for (const match of Str.matchAll(/\n/gu)(text)) {
    starts.push(Option.getOrElse(Option.fromNullishOr(match.index), () => NONE) + NAME_START);
  }
  return starts;
};

const topOf = (root: SyntaxNode): Result.Result<SyntaxNode, string> =>
  pipe(
    namedWhere((child) => child.type === "document")(root),
    Option.flatMap(namedWhere(isContainer)),
    Result.fromOption(() => "document has no block_node or flow_node"),
  );

const hasError = (root: SyntaxNode): boolean =>
  pipe(
    descendants(root),
    Arr.some((node) => node.isError || node.isMissing),
  );

const cache = new WeakMap<Source, Result.Result<Document, string>>();

const build = (source: Source): Result.Result<Document, string> => {
  const root = Option.fromNullishOr(source.syntax);
  if (Option.isNone(root) || hasError(root.value)) {
    return Result.fail("input is not valid YAML");
  }
  return Result.map(topOf(root.value), (top) => ({
    text: source.text,
    root: root.value,
    top,
    anchors: pipe(
      descendants(root.value),
      Arr.filter(isAnchor),
      Arr.flatMap((anchor) => Option.toArray(anchorOf(anchor))),
    ),
    lineStarts: lineStartsOf(source.text),
  }));
};

export const documentOf = (source: Source): Result.Result<Document, string> => {
  const hit = Option.fromNullishOr(cache.get(source));
  if (Option.isSome(hit)) {
    return hit.value;
  }
  const built = build(source);
  cache.set(source, built);
  return built;
};

export const resolveAnchor =
  (document: Document) =>
  (name: string, position: number): Option.Option<SyntaxNode> =>
    pipe(
      document.anchors,
      Arr.filter((anchor) => anchor.name === name && anchor.start < position),
      Arr.last,
      Option.map((anchor) => anchor.target),
    );

export const pointOf =
  (document: Document) =>
  (offset: number): Point => {
    const row = pipe(
      document.lineStarts,
      Arr.findLastIndex((start) => start <= offset),
      Option.getOrElse(() => NONE),
    );
    const start = Option.getOrElse(Arr.get(document.lineStarts, row), () => NONE);
    const column = encoder.encode(Str.slice(start, offset)(document.text)).length;
    return { row, column };
  };

const containing =
  (offset: number) =>
  (node: SyntaxNode): Option.Option<SyntaxNode> =>
    pipe(
      node.namedChildren,
      Arr.findFirst((child) => child.start <= offset && offset < child.end),
      Option.map((child) => Option.getOrElse(containing(offset)(child), () => child)),
    );

export const offsetInsideComment =
  (document: Document) =>
  (offset: number): boolean =>
    Option.exists(containing(offset)(document.root), isComment);
