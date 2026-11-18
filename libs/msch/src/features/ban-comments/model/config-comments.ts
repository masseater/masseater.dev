import { DockerfileParser } from "dockerfile-ast";
import { Array as Arr, Effect, Number as Num, String as Str, pipe } from "effect";
import { parse as parseSql } from "sql-parser-cst";

import {
  collectNodes,
  isRecord,
  tomlSourceComments,
  yamlSourceComments,
} from "#/shared/lib/config-comments.ts";

import { trimmed, unreadable } from "./found-comment.ts";
import type { Found } from "./found-comment.ts";

const NEXT = 1;

export const yamlComments = (source: string): Found =>
  Effect.try({
    try: () => pipe(yamlSourceComments(source), Arr.map(trimmed)),
    catch: unreadable("yaml"),
  });

export const tomlComments = (source: string): Found =>
  Effect.try({
    try: () => pipe(tomlSourceComments(source), Arr.map(trimmed)),
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

export const sqlComments = (source: string): Found =>
  Effect.try({
    try: () => {
      const program = parseSql(source, {
        dialect: "sqlite",
        includeComments: true,
        includeRange: true,
        paramTypes: [],
      });
      return pipe(
        collectNodes(isSqlComment)(program),
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

export const dockerfileComments = (source: string): Found =>
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
