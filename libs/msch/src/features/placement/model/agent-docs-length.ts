import { Option, String as Str, pipe } from "effect";

import { agentDocProblems } from "#/shared/lib/agent-docs.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";

const RECOMMENDED_LINES = 200;
const FIRST = 1;
const RULE: RuleName = "agent-docs-length";

const lineCount = (source: string): number => pipe(Str.trimEnd(source), Str.split("\n")).length;

const problemFor =
  (file: string) =>
  (lines: number): Option.Option<Problem> => {
    if (lines <= RECOMMENDED_LINES) {
      return Option.none();
    }
    return Option.some({
      file,
      line: RECOMMENDED_LINES + FIRST,
      column: FIRST,
      rule: RULE,
      message: `has ${String(lines)} lines. Claude Code recommends under ${String(RECOMMENDED_LINES)} lines per file: longer files cost context and are followed less reliably. Cut what the code already tells, and move rules shared across repositories into skills.`,
    });
  };

/** @internal */
export const checkAgentDocsLength = (root: string): ReturnType<typeof agentDocProblems> =>
  agentDocProblems(root, (file) => (source) => problemFor(file)(lineCount(source)));
