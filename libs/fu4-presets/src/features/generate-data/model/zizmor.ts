import { Array as Arr, Effect, Schema, String as Str, pipe } from "effect";

import { fetchText } from "./fetch.ts";
import { ZIZMOR_DATA } from "./sources.ts";

const lines = (text: string): readonly string[] =>
  pipe(Str.split("\n")(text), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));

const rows = (text: string): readonly (readonly string[])[] => Arr.map(lines(text), Str.split(","));

const parseJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const fetched = (name: string): ReturnType<typeof fetchText> => fetchText(`${ZIZMOR_DATA}/${name}`);

/** @internal */
export const zizmorData = Effect.all(
  {
    "zizmor/archived-repos.json": Effect.map(fetched("archived-repos.txt"), lines),
    "zizmor/github-hosted-runners.json": Effect.map(fetched("github-hosted-runners.txt"), lines),
    "zizmor/popular-actions.json": Effect.map(fetched("popular-actions.txt"), lines),
    "zizmor/popular-pre-commit-repos.json": Effect.map(
      fetched("popular-pre-commit-repos.txt"),
      lines,
    ),
    "zizmor/context-capabilities.json": Effect.map(fetched("context-capabilities.csv"), rows),
    "zizmor/codeql-injection-sinks.json": Effect.flatMap(
      fetched("codeql-injection-sinks.json"),
      parseJson,
    ),
  },
  { concurrency: "unbounded" },
);
