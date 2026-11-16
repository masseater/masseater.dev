import { Array as Arr, Exit, Option, Schema, SchemaIssue, pipe } from "effect";
import { findNodeAtLocation, parseTree, printParseErrorCode } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";

import { SongSchema } from "#/entities/song/index.ts";
import type { Song } from "#/entities/song/index.ts";

export type JsonPath = readonly (string | number)[];

export interface SourceIssue {
  readonly offset: number;
  readonly message: string;
}

export type SongSource =
  | { readonly status: "invalid"; readonly issues: readonly SourceIssue[] }
  | {
      readonly status: "valid";
      readonly song: Song;
      readonly offsetOf: (path: JsonPath) => number;
    };

type FailureResult = ReturnType<ReturnType<typeof SchemaIssue.makeFormatterStandardSchemaV1>>;

type IssueSegment = NonNullable<FailureResult["issues"][number]["path"]>[number];

const START = 0;

const strict = { disallowComments: true, allowTrailingComma: false };

const formatIssue = SchemaIssue.makeFormatterStandardSchemaV1();

const decode = Schema.decodeUnknownExit(Schema.fromJsonString(SongSchema));

const keyOf = (segment: IssueSegment): string | number => {
  if (typeof segment === "object") {
    return keyOf(segment.key);
  }
  if (typeof segment === "number") {
    return segment;
  }
  return String(segment);
};

const prefixOf =
  (path: JsonPath) =>
  (length: number): (string | number)[] =>
    Arr.copy(Arr.take(path, length));

const locatorOf = (text: string): ((path: JsonPath) => number) => {
  const tree = Option.fromNullishOr(parseTree(text, [], strict));
  return (path) =>
    Option.match(tree, {
      onNone: () => START,
      onSome: (root) => {
        const lengths = pipe(Arr.range(START, path.length), Arr.reverse);
        return pipe(
          lengths,
          Arr.findFirst((length) =>
            Option.fromNullishOr(findNodeAtLocation(root, prefixOf(path)(length))),
          ),
          Option.match({ onNone: () => root.offset, onSome: (node) => node.offset }),
        );
      },
    });
};

const syntaxIssuesOf = (text: string): readonly SourceIssue[] => {
  const errors: ParseError[] = [];
  parseTree(text, errors, strict);
  return pipe(
    errors,
    Arr.map((error) => ({
      offset: error.offset,
      message: `The file is not valid JSON: ${printParseErrorCode(error.error)}.`,
    })),
  );
};

export const readSong = (text: string): SongSource => {
  const syntax = syntaxIssuesOf(text);
  if (Arr.isReadonlyArrayNonEmpty(syntax)) {
    return { status: "invalid", issues: syntax };
  }
  const offsetOf = locatorOf(text);
  const decoded = decode(text);
  if (Exit.isSuccess(decoded)) {
    return { status: "valid", song: decoded.value, offsetOf };
  }
  const issues = pipe(
    Exit.findErrorOption(decoded),
    Option.map((error) => formatIssue(error.issue).issues),
    Option.getOrElse((): FailureResult["issues"] => []),
    Arr.map((issue) => ({
      offset: offsetOf(pipe(issue.path ?? [], Arr.map(keyOf))),
      message: issue.message,
    })),
  );
  return { status: "invalid", issues };
};
