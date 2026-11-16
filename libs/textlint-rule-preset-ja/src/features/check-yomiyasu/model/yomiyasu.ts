import type { TextlintRuleModule } from "@textlint/types";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { lintText } from "#upstream/lint.ts";
import type { Finding } from "#upstream/lint.ts";

const LINE_BREAK = /\r\n|\r|\n/gu;
const FIRST_LINE = 1;
const DOCUMENT_START = 0;
const MANUAL = /(?:^|[\\/])README(?:\.[^\\/]*)?$/iu;
const MANUAL_SKIPPED_RULES: ReadonlySet<string> = new Set(["excess_list"]);

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

/** @internal */
export const findingsOf =
  (filePath: string) =>
  (text: string): readonly Finding[] => {
    const manual = MANUAL.test(filePath);
    return Arr.filter(
      lintText(text),
      (finding) => !(manual && MANUAL_SKIPPED_RULES.has(finding.rule)),
    );
  };

export const yomiyasu: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report, getSource, getFilePath, locator } = context;
  return {
    [Syntax.Document]: (node) => {
      const text = getSource(node);
      const starts = lineStarts(text);
      for (const finding of findingsOf(getFilePath() ?? "")(text)) {
        const padding = locator.at(startOf(starts, finding.line));
        const message = `${finding.rule}: ${finding.message}（${finding.snippet}）`;
        report(node, new RuleError(message, { padding }));
      }
    },
  };
};
