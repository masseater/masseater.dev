import { DockerfileParser } from "dockerfile-ast";
import { Array as Arr, Effect, Number as Num, Record as Rec, String as Str, pipe } from "effect";
import { parse as parseSql } from "sql-parser-cst";
import { parseTOML } from "toml-eslint-parser";
import { Parser as YamlParser } from "yaml";

import { trimmed, unreadable } from "./found-comment.ts";
import type { Found } from "./found-comment.ts";

const NEXT = 1;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const childrenOf = (value: unknown): readonly unknown[] => {
  if (Arr.isArray(value)) {
    return value;
  }
  if (isRecord(value)) {
    return Rec.values(value);
  }
  return [];
};

const collect =
  <Item>(isItem: (value: unknown) => value is Item) =>
  (value: unknown): readonly Item[] => {
    if (isItem(value)) {
      return [value];
    }
    return pipe(childrenOf(value), Arr.flatMap(collect(isItem)));
  };

interface YamlSourceToken {
  readonly offset: number;
  readonly source: string;
}

const isYamlComment = (value: unknown): value is YamlSourceToken =>
  isRecord(value) &&
  value["type"] === "comment" &&
  typeof value["offset"] === "number" &&
  typeof value["source"] === "string";

const yamlComments = (source: string): Found =>
  Effect.try({
    try: () =>
      pipe(
        Arr.fromIterable(new YamlParser().parse(source)),
        Arr.flatMap(collect(isYamlComment)),
        Arr.map((token) => trimmed({ index: token.offset, text: token.source })),
      ),
    catch: unreadable("yaml"),
  });

const tomlComments = (source: string): Found =>
  Effect.try({
    try: () =>
      pipe(
        parseTOML(source).comments,
        Arr.map(({ range: [start, end] }) =>
          trimmed({ index: start, text: Str.slice(start, end)(source) }),
        ),
      ),
    catch: unreadable("toml"),
  });

interface SqlComment {
  readonly text: string;
  readonly range: readonly [number, number];
}

const isSqlComment = (value: unknown): value is SqlComment =>
  isRecord(value) &&
  (value["type"] === "line_comment" || value["type"] === "block_comment") &&
  typeof value["text"] === "string" &&
  Arr.isArray(value["range"]);

const sqlComments = (source: string): Found =>
  Effect.try({
    try: () => {
      const program = parseSql(source, {
        dialect: "sqlite",
        includeComments: true,
        includeRange: true,
        paramTypes: [],
      });
      return pipe(
        collect(isSqlComment)(program),
        Arr.map(({ range: [start], text }) => trimmed({ index: start, text })),
      );
    },
    catch: unreadable("sql"),
  });

const offsetAt =
  (lines: readonly string[]) =>
  ({ line, character }: Readonly<{ line: number; character: number }>): number =>
    character +
    pipe(
      lines,
      Arr.take(line),
      Arr.map((text) => text.length + NEXT),
      Num.sumAll,
    );

const dockerfileComments = (source: string): Found =>
  Effect.try({
    try: () => {
      const lines = Str.split(source, "\n");
      return pipe(
        DockerfileParser.parse(source).getComments(),
        Arr.map((comment) =>
          trimmed({
            index: offsetAt(lines)(comment.getRange().start),
            text: comment.toString(),
          }),
        ),
      );
    },
    catch: unreadable("dockerfile"),
  });

export { dockerfileComments, sqlComments, tomlComments, yamlComments };
