import { Array as Arr, HashMap, Option, Schema, pipe } from "effect";
import { parseTOML } from "toml-eslint-parser";
import { parseDocument } from "yaml";

import { tomlSourceComments, yamlSourceComments } from "#/shared/lib/config-comments.ts";
import type { SourceComment } from "#/shared/lib/config-comments.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

export const WORKSPACE_SECTIONS = [
  "overrides",
  "patchedDependencies",
  "packageExtensions",
] as const;
const CARGO_PATCH = "patch";
const KEY_SEPARATOR = ".";
const PATCH_SOURCE_DEPTH = 2;

export type Section = (typeof WORKSPACE_SECTIONS)[number] | typeof CARGO_PATCH;

export interface DeviationEntry {
  readonly section: Section;
  readonly key: string;
  readonly index: number;
  readonly line: number;
}

export interface LineComment extends SourceComment {
  readonly line: number;
}

export interface Deviations {
  readonly entries: readonly DeviationEntry[];
  readonly comments: readonly LineComment[];
}

const NONE: Deviations = { entries: [], comments: [] };

const KeyValue = Schema.Union([Schema.String, Schema.Finite]);
const Positions = Schema.Array(Schema.Finite);
const YamlKey = Schema.Struct({ value: KeyValue, range: Positions });
const YamlMap = Schema.Struct({ items: Schema.Array(Schema.Struct({ key: YamlKey })) });

const KeyPart = Schema.Union([
  Schema.Struct({ type: Schema.Literal("TOMLBare"), name: Schema.String }),
  Schema.Struct({ type: Schema.Literal("TOMLQuoted"), value: Schema.String }),
]);
const Located = {
  range: Schema.Array(Schema.Finite),
  loc: Schema.Struct({ start: Schema.Struct({ line: Schema.Finite }) }),
};
const TomlKeyValue = Schema.Struct({
  ...Located,
  type: Schema.Literal("TOMLKeyValue"),
  key: Schema.Struct({ keys: Schema.Array(KeyPart) }),
});
const TomlTable = Schema.Struct({
  ...Located,
  type: Schema.Literal("TOMLTable"),
  resolvedKey: Schema.Array(Schema.Union([Schema.String, Schema.Finite])),
  body: Schema.Array(TomlKeyValue),
});
const TomlNode = Schema.Union([TomlTable, TomlKeyValue]);
const TomlTop = Schema.Array(Schema.Struct({ body: Schema.Array(TomlNode) }));

type TomlTableType = typeof TomlTable.Type;
type KeyPartType = typeof KeyPart.Type;

const decodeYamlMap = Schema.decodeUnknownOption(YamlMap);
const decodeTomlTop = Schema.decodeUnknownOption(TomlTop);
const FIRST = 0;

const lineComments = (source: string, comments: readonly SourceComment[]): readonly LineComment[] =>
  pipe(
    comments,
    Arr.map((comment) => ({ ...comment, line: positionOf(source)(comment.index).line })),
  );

const startOf = (range: readonly number[]): number =>
  Option.getOrElse(Arr.get(range, FIRST), () => FIRST);

const sectionEntries =
  (source: string, sectionNode: (section: string) => unknown) =>
  (section: (typeof WORKSPACE_SECTIONS)[number]): readonly DeviationEntry[] =>
    pipe(
      decodeYamlMap(sectionNode(section)),
      Option.match({
        onNone: () => [],
        onSome: ({ items }) =>
          pipe(
            items,
            Arr.map(({ key }) => {
              const index = startOf(key.range);
              return {
                section,
                key: String(key.value),
                index,
                line: positionOf(source)(index).line,
              };
            }),
          ),
      }),
    );

export const workspaceDeviations = (source: string): Deviations => {
  const document = parseDocument(source);
  if (Arr.isReadonlyArrayNonEmpty(document.errors)) {
    return NONE;
  }
  const sectionNode = (section: string): unknown => document.get(section, true);
  return {
    entries: pipe(WORKSPACE_SECTIONS, Arr.flatMap(sectionEntries(source, sectionNode))),
    comments: lineComments(source, yamlSourceComments(source)),
  };
};

const partName = (part: KeyPartType): string => {
  if (part.type === "TOMLBare") {
    return part.name;
  }
  return part.value;
};

const patchEntries = (table: TomlTableType): readonly DeviationEntry[] => {
  const tableKey = pipe(table.resolvedKey, Arr.map(String));
  if (!Option.exists(Arr.get(tableKey, FIRST), (part) => part === CARGO_PATCH)) {
    return [];
  }
  if (tableKey.length > PATCH_SOURCE_DEPTH) {
    return [
      {
        section: CARGO_PATCH,
        key: Arr.join(tableKey, KEY_SEPARATOR),
        index: startOf(table.range),
        line: table.loc.start.line,
      },
    ];
  }
  return pipe(
    table.body,
    Arr.map((value) => ({
      section: CARGO_PATCH,
      key: Arr.join([...tableKey, ...pipe(value.key.keys, Arr.map(partName))], KEY_SEPARATOR),
      index: startOf(value.range),
      line: value.loc.start.line,
    })),
  );
};

const isTable = (node: TomlTableType | typeof TomlKeyValue.Type): node is TomlTableType =>
  node.type === "TOMLTable";

export const cargoDeviations = (source: string): Deviations =>
  pipe(
    Option.liftThrowable(() => parseTOML(source).body)(),
    Option.flatMap(decodeTomlTop),
    Option.match({
      onNone: () => NONE,
      onSome: (tops) => ({
        entries: pipe(
          tops,
          Arr.flatMap(({ body }) => body),
          Arr.filter(isTable),
          Arr.flatMap(patchEntries),
        ),
        comments: lineComments(source, tomlSourceComments(source)),
      }),
    }),
  );

export const commentsByLine = (
  comments: readonly LineComment[],
): HashMap.HashMap<number, LineComment> =>
  HashMap.fromIterable(
    pipe(
      comments,
      Arr.map((comment) => [comment.line, comment] as const),
    ),
  );
