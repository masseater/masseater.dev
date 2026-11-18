import { Array as Arr, Number as Num, String as Str, pipe } from "effect";

import { table } from "#/shared/lib/markdown.ts";
import { shareOf } from "#/shared/lib/stats.ts";

export type FileChange = Readonly<{
  filename: string;
  additions: number;
  deletions: number;
  patch: string;
}>;

export type Fixes = Readonly<{
  repository: string;
  number: number;
  files: readonly string[];
  translatedLines: number;
  fixedLines: number;
  hunks: number;
  percent: number;
}>;

const DIGITS = 1;

const hunksIn = (patch: string): number =>
  pipe(Str.split(patch, "\n"), Arr.filter(Str.startsWith("@@ ")), Arr.length);

export const fixesOf =
  (pull: Readonly<{ repository: string; number: number }>) =>
  ({
    files,
    translatedLines,
    fix,
  }: Readonly<{
    files: readonly string[];
    translatedLines: number;
    fix: readonly FileChange[];
  }>): Fixes => {
    const translated = new Set(files);
    const touched = pipe(
      fix,
      Arr.filter((change) => translated.has(change.filename)),
    );
    const fixedLines = pipe(
      touched,
      Arr.map((change) => Math.max(change.additions, change.deletions)),
      Num.sumAll,
    );
    return {
      ...pull,
      files,
      translatedLines,
      fixedLines,
      hunks: pipe(
        touched,
        Arr.map((change) => hunksIn(change.patch)),
        Num.sumAll,
      ),
      percent: Number(shareOf(translatedLines)(fixedLines).toFixed(DIGITS)),
    };
  };

const COLUMNS = ["repository", "number", "translatedLines", "fixedLines", "hunks", "percent"];

export const fixesSummary = (fixes: readonly Fixes[]): string => {
  const rows = pipe(
    fixes,
    Arr.map((entry) => ({
      repository: entry.repository,
      number: entry.number,
      translatedLines: entry.translatedLines,
      fixedLines: entry.fixedLines,
      hunks: entry.hunks,
      percent: entry.percent,
    })),
  );
  return table(COLUMNS)(rows);
};
