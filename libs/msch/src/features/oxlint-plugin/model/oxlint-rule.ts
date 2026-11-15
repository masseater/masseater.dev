import { Array as Arr, pipe } from "effect";
import type { Diagnostic, Plugin, Rule } from "vite-plus/lint/plugins";

import { describeFinding } from "#/shared/lib/problem.ts";
import type { Problem } from "#/shared/lib/problem.ts";
import { POSITION_BASE } from "#/shared/lib/syntax.ts";

export type ProblemLoader = (cwd: string) => readonly Problem[];

const diagnosticOf = (problem: Problem): Diagnostic => ({
  message: describeFinding(problem),
  loc: { start: { line: problem.line, column: problem.column - POSITION_BASE } },
});

const vocabularyRule = (load: ProblemLoader): Rule => ({
  create: (context) => ({
    Program: () => {
      const problems = pipe(
        load(context.cwd),
        Arr.filter((problem) => problem.file === context.filename),
      );
      for (const problem of problems) {
        context.report(diagnosticOf(problem));
      }
    },
  }),
});

export const mschPlugin = (load: ProblemLoader): Plugin & { rules: { vocabulary: Rule } } => ({
  meta: { name: "msch" },
  rules: { vocabulary: vocabularyRule(load) },
});
