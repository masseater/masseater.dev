import { Array as Arr, String as Str, pipe } from "effect";

import type { Entry } from "./atoms.ts";

const RECENT_CHARS = 1200;

const lineOf = (entry: Entry): string => {
  if (entry.kind === "speech") {
    return `本人: ${entry.text}`;
  }
  return `聞き手: ${entry.question}`;
};

const linesOf = (entries: readonly Entry[]): string =>
  pipe(entries, Arr.map(lineOf), Arr.join("\n"));

const recentOf = (entries: readonly Entry[]): string => Str.slice(-RECENT_CHARS)(linesOf(entries));

const questionOf = (entry: Entry): readonly string[] => {
  if (entry.kind === "question") {
    return [entry.question];
  }
  return [];
};

const askedOf = (entries: readonly Entry[]): readonly string[] =>
  pipe(entries, Arr.flatMap(questionOf));

const speechAfter = (through: number): ((entries: readonly Entry[]) => readonly Entry[]) =>
  Arr.filter((entry) => entry.kind === "speech" && entry.id > through);

export { askedOf, linesOf, recentOf, speechAfter };
