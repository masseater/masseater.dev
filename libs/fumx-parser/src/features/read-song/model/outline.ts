import { Array as Arr, Option, pipe } from "effect";
import { GrammarUtils } from "langium";
import type { AstNode, CstNode } from "langium";

import type { Song as SongNode } from "#generated/langium/ast.ts";

import { isNamed } from "./declarations.ts";
import type { Named } from "./declarations.ts";
import type { From } from "./problem.ts";
import { importedUriOf } from "./scope.ts";

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface NamedSpan {
  readonly type: Named["$type"];
  readonly name: string;
  readonly span: Span;
}

export interface ImportSpan {
  readonly path: string;
  readonly span: Span;
}

export interface Outline {
  readonly title: Option.Option<Span>;
  readonly names: readonly NamedSpan[];
  readonly imports: readonly ImportSpan[];
  readonly files: readonly string[];
}

export const emptyOutline: Outline = {
  title: Option.none(),
  names: [],
  imports: [],
  files: [],
};

const spanOf: From<CstNode, Span> = (node) => ({ start: node.offset, end: node.end });

const propertySpanOf: From<AstNode, From<string, Option.Option<Span>>> = (node) => (property) =>
  pipe(
    Option.fromNullishOr(GrammarUtils.findNodeForProperty(node.$cstNode, property)),
    Option.map(spanOf),
  );

const namesOf: From<SongNode, readonly NamedSpan[]> = (song) =>
  pipe(
    song.declarations,
    Arr.filter(isNamed),
    Arr.flatMap((declaration) =>
      pipe(
        propertySpanOf(declaration)("name"),
        Option.map((span) => ({ type: declaration.$type, name: declaration.name, span })),
        Option.toArray,
      ),
    ),
  );

const importsOf: From<SongNode, readonly ImportSpan[]> = (song) =>
  pipe(
    song.imports,
    Arr.flatMap((node) =>
      pipe(
        propertySpanOf(node)("path"),
        Option.map((span) => ({ path: importedUriOf(node).fsPath, span })),
        Option.toArray,
      ),
    ),
  );

export const outlineOf: From<readonly string[], From<SongNode, Outline>> = (files) => (song) => ({
  title: propertySpanOf(song)("title"),
  names: namesOf(song),
  imports: importsOf(song),
  files,
});
