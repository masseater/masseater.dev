import type { TextlintRuleModule } from "@textlint/types";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { lintText } from "#upstream/lint.ts";

const LINE_BREAK = /\r\n|\r|\n/gu;
const FIRST_LINE = 1;
const DOCUMENT_START = 0;

const breakLength = (found: RegExpMatchArray): number =>
  pipe(
    Arr.head(found),
    Option.map(Str.length),
    Option.getOrElse(() => DOCUMENT_START),
  );

const nextLineStart = (found: RegExpMatchArray): number =>
  (found.index ?? DOCUMENT_START) + breakLength(found);

const lineStarts = (text: string): readonly number[] => [
  DOCUMENT_START,
  ...Arr.map(Arr.fromIterable(Str.matchAll(LINE_BREAK)(text)), nextLineStart),
];

const startOf = (starts: readonly number[], line: number): number =>
  pipe(
    Arr.get(starts, line - FIRST_LINE),
    Option.getOrElse(() => DOCUMENT_START),
  );

const rule: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report, getSource, locator } = context;
  return {
    [Syntax.Document]: (node) => {
      const text = getSource(node);
      const starts = lineStarts(text);
      for (const finding of lintText(text)) {
        const padding = locator.at(startOf(starts, finding.line));
        const message = `${finding.rule}: ${finding.message}（${finding.snippet}）`;
        report(node, new RuleError(message, { padding }));
      }
    },
  };
};

export default rule;
