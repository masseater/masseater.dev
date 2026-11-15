import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Entry } from "./atoms.ts";

const RECENT_CHARS = 1200;

const lineOf = (entry: Entry): string => {
  if (entry.kind === "speech") {
    return `本人: ${entry.text}`;
  }
  return `聞き手: ${entry.question}`;
};

export const linesOf = (entries: readonly Entry[]): string =>
  pipe(entries, Arr.map(lineOf), Arr.join("\n"));

export const recentOf = (entries: readonly Entry[]): string =>
  Str.slice(-RECENT_CHARS)(linesOf(entries));

const questionOf = (entry: Entry): readonly string[] => {
  if (entry.kind === "question") {
    return [
      Option.match(entry.strategy, {
        onNone: () => entry.question,
        onSome: (strategy) => `[${strategy}] ${entry.question}`,
      }),
    ];
  }
  return [];
};

export const askedOf = (entries: readonly Entry[]): readonly string[] =>
  pipe(entries, Arr.flatMap(questionOf));

export const speechAfter = (through: number): ((entries: readonly Entry[]) => readonly Entry[]) =>
  Arr.filter((entry) => entry.kind === "speech" && entry.id > through);
