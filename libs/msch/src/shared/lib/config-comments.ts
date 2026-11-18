import { Array as Arr, Record as Rec, String as Str, pipe } from "effect";
import { parseTOML } from "toml-eslint-parser";
import { Parser as YamlParser } from "yaml";

export interface SourceComment {
  readonly index: number;
  readonly text: string;
}

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
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

export const collectNodes =
  <Item>(isItem: (value: unknown) => value is Item) =>
  (value: unknown): readonly Item[] => {
    if (isItem(value)) {
      return [value];
    }
    return pipe(childrenOf(value), Arr.flatMap(collectNodes(isItem)));
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

export const yamlSourceComments = (source: string): readonly SourceComment[] =>
  pipe(
    Arr.fromIterable(new YamlParser().parse(source)),
    Arr.flatMap(collectNodes(isYamlComment)),
    Arr.map((token) => ({ index: token.offset, text: token.source })),
  );

export const tomlSourceComments = (source: string): readonly SourceComment[] =>
  pipe(
    parseTOML(source).comments,
    Arr.map(({ range: [start, end] }) => ({
      index: start,
      text: Str.slice(start, end)(source),
    })),
  );
