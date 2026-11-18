import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, Result, String as Str, pipe } from "effect";

import type {
  Comment,
  ConcreteFeature,
  Location,
  SymbolicLocation,
} from "#/features/zizmor/model/finding.ts";
import { locateWithin, subfeature, subfeatureOf } from "#/shared/subfeature/index.ts";
import type { Subfeature } from "#/shared/subfeature/index.ts";
import {
  featureComments,
  pointOf,
  queryExact,
  queryKeyOnly,
  queryPretty,
  withLeadingWhitespace,
} from "#/shared/yamlpath/index.ts";
import type { Component, Document } from "#/shared/yamlpath/index.ts";

const IGNORE = /# zizmor: ignore\[(?<rules>.+)\](?:\s+.*)?$/u;

export const rootLocation = (annotation: string): SymbolicLocation => ({
  annotation,
  link: Option.none(),
  route: [],
  feature: { type: "normal" },
  kind: "related",
});

export const withKeys =
  (...keys: readonly Component[]) =>
  (location: SymbolicLocation): SymbolicLocation => ({
    ...location,
    link: Option.none(),
    route: [...location.route, ...keys],
    feature: { type: "normal" },
  });

export const annotated =
  (annotation: string) =>
  (location: SymbolicLocation): SymbolicLocation => ({ ...location, annotation });

export const withSubfeature =
  (part: Subfeature) =>
  (location: SymbolicLocation): SymbolicLocation => ({
    ...location,
    feature: { type: "subfeature", subfeature: part },
  });

export const withinText = (text: string): ((location: SymbolicLocation) => SymbolicLocation) =>
  withSubfeature(subfeature(text));

export const withinAt =
  (start: number) =>
  (text: string): ((location: SymbolicLocation) => SymbolicLocation) =>
    withSubfeature(subfeatureOf(start)(text));

export const keyOnly = (location: SymbolicLocation): SymbolicLocation => ({
  ...location,
  feature: { type: "key-only" },
});

export const withUrl =
  (url: string) =>
  (location: SymbolicLocation): SymbolicLocation => ({ ...location, link: Option.some(url) });

export const primary = (location: SymbolicLocation): SymbolicLocation => ({
  ...location,
  kind: "primary",
});

export const hidden = (location: SymbolicLocation): SymbolicLocation => ({
  ...location,
  kind: "hidden",
});

const commentOf =
  (document: Document) =>
  (node: SyntaxNode): Comment => ({
    raw: node.text,
    start: pointOf(document)(node.start),
    offset: node.start,
  });

const concrete =
  (document: Document) =>
  (
    feature: SyntaxNode,
    span: { readonly start: number; readonly end: number },
    text: string,
  ): ConcreteFeature => ({
    start: pointOf(document)(span.start),
    end: pointOf(document)(span.end),
    startOffset: span.start,
    endOffset: span.end,
    text,
    comments: Arr.map(featureComments(document)(feature), commentOf(document)),
  });

const located = (
  document: Document,
  location: SymbolicLocation,
): Result.Result<ConcreteFeature, string> => {
  const { feature } = location;
  if (feature.type === "subfeature") {
    return Result.flatMap(queryExact(document)(location.route), (found) =>
      Result.flatMap(
        Result.fromOption(
          found,
          () => `failed to extract exact feature for symbolic location: ${location.annotation}`,
        ),
        (node) =>
          Result.map(
            Result.fromOption(
              locateWithin(feature.subfeature)(node.text),
              () => "failed to locate subfeature",
            ),
            (span) =>
              concrete(document)(
                node,
                { start: span.start + node.start, end: span.end + node.start },
                node.text,
              ),
          ),
      ),
    );
  }
  if (feature.type === "key-only") {
    return Result.map(queryKeyOnly(document)(location.route), (node) =>
      concrete(document)(node, node, node.text),
    );
  }
  return Result.map(queryPretty(document)(location.route), (node) =>
    concrete(document)(node, node, withLeadingWhitespace(document)(node)),
  );
};

export const concretize =
  (document: Document) =>
  (location: SymbolicLocation): Result.Result<Location, string> =>
    Result.map(located(document, location), (found) => ({ symbolic: location, concrete: found }));

export const commentIgnores =
  (ident: string) =>
  (comment: Comment): boolean =>
    pipe(
      Option.fromNullishOr(IGNORE.exec(comment.raw)),
      Option.flatMap((match) => Option.fromNullishOr(match.groups)),
      Option.flatMap(Rec.get("rules")),
      Option.exists((rules) =>
        pipe(
          Str.split(",")(rules),
          Arr.some((rule) => Str.trim(rule) === ident),
        ),
      ),
    );

const LEADING_HASH = /^#/u;

export const isMeaningful = (comment: Comment): boolean =>
  Str.isNonEmpty(Str.trim(Str.replace(LEADING_HASH, "")(comment.raw)));

const ANY_COMMENT = /#.*$/u;
const NEXT_ROW = 1;
const NEWLINE = 1;
const WHOLE = 0;
const INCLUSIVE = 1;

const lineComment =
  (document: Document) =>
  (row: number): readonly Comment[] => {
    const start = Option.getOrElse(Arr.get(document.lineStarts, row), () => document.text.length);
    const next = Option.getOrElse(
      Arr.get(document.lineStarts, row + NEXT_ROW),
      () => document.text.length + NEWLINE,
    );
    const line = Str.trimEnd(Str.slice(start, next - NEWLINE)(document.text));
    return pipe(
      Option.fromNullishOr(ANY_COMMENT.exec(line)),
      Option.map((match) => ({
        raw: match[WHOLE],
        start: pointOf(document)(start + match.index),
        offset: start + match.index,
      })),
      Option.toArray,
    );
  };

export const spanFeature =
  (document: Document) =>
  (span: { readonly start: number; readonly end: number }): ConcreteFeature => {
    const start = pointOf(document)(span.start);
    const end = pointOf(document)(span.end);
    return {
      start,
      end,
      startOffset: span.start,
      endOffset: span.end,
      text: Str.slice(span.start, span.end)(document.text),
      comments: Arr.flatMap(
        Arr.makeBy(end.row - start.row + INCLUSIVE, (index) => start.row + index),
        lineComment(document),
      ),
    };
  };

export const subfeatureLocation =
  (document: Document) =>
  (symbolic: SymbolicLocation, part: Subfeature): Location => ({
    symbolic,
    concrete: spanFeature(document)(Option.getOrThrow(locateWithin(part)(document.text))),
  });
