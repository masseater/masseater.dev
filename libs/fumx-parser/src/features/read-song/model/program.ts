import { Array as Arr } from "effect";

import type { Bar, Song as SongNode } from "#generated/langium/ast.ts";

import { typeProblemsOf } from "./check.ts";
import { runSong } from "./evaluate.ts";
import type { Compiled, From } from "./problem.ts";

export const programOf: From<SongNode, Compiled<readonly Bar[]>> = (song) => {
  const typeProblems = typeProblemsOf(song);
  if (Arr.isReadonlyArrayNonEmpty(typeProblems)) {
    return { value: [], problems: typeProblems };
  }
  return runSong(song);
};
