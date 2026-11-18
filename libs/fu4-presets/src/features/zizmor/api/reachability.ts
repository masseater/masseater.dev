import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Reachability } from "#/features/zizmor/model/github.ts";

export const REACHABLE_FILE = [
  "node_modules",
  ".cache",
  "fu4",
  "zizmor-reachable-commits.txt",
] as const;

const keyOf = (slug: string, commit: string): string =>
  `${Str.toLowerCase(slug)} ${Str.toLowerCase(commit)}`;

const linesOf = (text: string): Set<string> =>
  new Set(
    pipe(
      Str.split("\n")(text),
      Arr.filter((line) => Str.isNonEmpty(line)),
    ),
  );

export const reachabilityOf =
  (append: (line: string) => Effect.Effect<void>) =>
  (saved: string): Reachability => {
    const keys = linesOf(saved);
    return {
      known: (slug) => (commit) => Effect.succeed(keys.has(keyOf(slug, commit))),
      remember: (slug) => (commit) => {
        const key = keyOf(slug, commit);
        if (keys.has(key)) {
          return Effect.void;
        }
        keys.add(key);
        return append(`${key}\n`);
      },
    };
  };
