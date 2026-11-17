import { Array as Arr, Effect, pipe } from "effect";

import { fetchText } from "./fetch.ts";
import { ZIZMOR_DATA } from "./sources.ts";

const FILES = [
  "archived-repos.txt",
  "codeql-injection-sinks.json",
  "context-capabilities.csv",
  "github-hosted-runners.txt",
  "popular-actions.txt",
  "popular-pre-commit-repos.txt",
] as const;

/** @internal */
export const zizmorData = Effect.all(
  pipe(
    FILES,
    Arr.map((name) =>
      fetchText(`${ZIZMOR_DATA}/${name}`).pipe(
        Effect.map((text): readonly [string, string] => [`zizmor/${name}`, text]),
      ),
    ),
  ),
  { concurrency: "unbounded" },
);
