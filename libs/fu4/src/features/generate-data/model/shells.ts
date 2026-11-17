import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";
import type { TableRow } from "mdast";
import { toString as textOf } from "mdast-util-to-string";

import { Fu4Error } from "#/shared/lib/errors.ts";

import { renderDocs } from "./liquid.ts";
import { bodyRows, codeAt, parseMarkdown } from "./markdown.ts";
import { SHELLS } from "./sources.ts";

const EVERY_PLATFORM = "All";
const UNIX = "Linux / macOS";
const WINDOWS = "Windows";
const PLATFORM_COLUMN = 0;
const SHELL_COLUMN = 1;

interface PlatformShell {
  readonly platform: string;
  readonly shell: string;
}

export interface Shells {
  readonly unix: readonly string[];
  readonly windows: readonly string[];
}

const platformOf = (row: TableRow): Option.Option<string> =>
  pipe(
    Arr.get(row.children, PLATFORM_COLUMN),
    Option.map((cell) => Str.trim(textOf(cell))),
  );

const supported =
  (rows: readonly PlatformShell[]) =>
  (platform: string): readonly string[] =>
    pipe(
      rows,
      Arr.filter((row) => row.platform === platform || row.platform === EVERY_PLATFORM),
      Arr.map((row) => row.shell),
      Arr.dedupe,
      Arr.sortBy(Str.Order),
    );

/** @internal */
export const shells: Effect.Effect<Shells, Fu4Error, HttpClient.HttpClient> = Effect.gen(
  function* shells() {
    const source = yield* renderDocs(SHELLS);
    const table = yield* pipe(
      parseMarkdown(source).children,
      Arr.findFirst((node) => node.type === "table"),
      Effect.fromOption,
      Effect.mapError(() => Fu4Error.make({ message: "no supported shells table" })),
    );
    const rows = pipe(
      bodyRows(table),
      Arr.map((row) => Option.all({ platform: platformOf(row), shell: codeAt(SHELL_COLUMN)(row) })),
      Arr.getSomes,
    );
    return { unix: supported(rows)(UNIX), windows: supported(rows)(WINDOWS) };
  },
);
