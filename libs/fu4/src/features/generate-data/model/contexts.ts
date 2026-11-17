import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";
import type { TableRow } from "mdast";
import { toString as textOf } from "mdast-util-to-string";

import type { Fu4Error } from "#/shared/lib/errors.ts";

import { fetchText } from "./fetch.ts";
import { renderDocs } from "./liquid.ts";
import { parseMarkdown } from "./markdown.ts";
import { CONTEXTS, RUNNER_GITHUB_CONTEXT } from "./sources.ts";

const SEPARATOR = ".";
const PATH_COLUMN = 0;
const TYPE_COLUMN = 1;
const SINGLE = 1;
const GITHUB = "github";
const STRING = "string";
const ALLOWLIST = /_contextEnvAllowlist[^{]*\{(?<body>[^}]*)\}/u;
const QUOTED = /"(?<name>[^"]+)"/gu;

export interface ContextTree {
  readonly [key: string]: string | ContextTree;
}

type Row = readonly [readonly string[], string];

const codeOf = (row: TableRow, column: number): Option.Option<string> =>
  pipe(
    Arr.get(row.children, column),
    Option.filter((cell) => cell.children.length === SINGLE),
    Option.flatMap((cell) => Arr.head(cell.children)),
    Option.filter((child) => child.type === "inlineCode"),
    Option.map((child) => textOf(child)),
  );

const splitPath = Str.split(SEPARATOR);

const rowOf = (row: TableRow): Option.Option<Row> =>
  Option.all([pipe(codeOf(row, PATH_COLUMN), Option.map(splitPath)), codeOf(row, TYPE_COLUMN)]);

const TYPE_NAME = /^[a-z]+$/u;
const NEXT = 1;

const treeOf = (rows: readonly Row[]): ContextTree =>
  pipe(
    rows,
    Arr.groupBy(([path]) => Arr.join(Arr.take(path, NEXT), SEPARATOR)),
    Rec.map((group): string | ContextTree => {
      const deeper = pipe(
        group,
        Arr.filter(([path]) => path.length > SINGLE),
        Arr.map(([path, type]): Row => [Arr.drop(path, NEXT), type]),
      );
      if (Arr.isReadonlyArrayNonEmpty(deeper)) {
        return treeOf(deeper);
      }
      return Arr.headNonEmpty(group)[TYPE_COLUMN];
    }),
  );

const documentedRows = (source: string): readonly Row[] =>
  pipe(
    parseMarkdown(source).children,
    Arr.filter((node) => node.type === "table"),
    Arr.flatMap((table) => Arr.drop(table.children, NEXT)),
    Arr.map(rowOf),
    Arr.getSomes,
    Arr.filter(([path, type]) => path.length > SINGLE && TYPE_NAME.test(type)),
  );

const runnerRows = (source: string): readonly Row[] =>
  pipe(
    Option.fromNullishOr(ALLOWLIST.exec(source)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap((groups) => Rec.get(groups, "body")),
    Option.map((body) => [...Str.matchAll(QUOTED)(body)]),
    Option.getOrElse(Arr.empty<RegExpMatchArray>),
    Arr.map((match) =>
      pipe(
        Option.fromNullishOr(match.groups),
        Option.flatMap((groups) => Rec.get(groups, "name")),
      ),
    ),
    Arr.getSomes,
    Arr.map((name): Row => [[GITHUB, name], STRING]),
  );

/** @internal */
export const contexts: Effect.Effect<ContextTree, Fu4Error, HttpClient.HttpClient> = Effect.gen(
  function* contexts() {
    const [docs, runner] = yield* Effect.all(
      [renderDocs(CONTEXTS), fetchText(RUNNER_GITHUB_CONTEXT)],
      { concurrency: "unbounded" },
    );
    return treeOf([...documentedRows(docs), ...runnerRows(runner)]);
  },
);
