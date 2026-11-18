import type { Position } from "@r_masseater/fu4";
import { Option, Result, String as Str, pipe } from "effect";

import { isConstant, parse } from "#/entities/expression/index.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const OPEN = "${{";
const CLOSE = "}}";
const START = 0;
const SINGLE = 2;

const checkExpression =
  (fail: Fail) =>
  (at: Position, input: string): void => {
    const trimmed = Str.trim(input);
    const constant = pipe(
      parse(`${trimmed}${CLOSE}`).result,
      Result.getSuccess,
      Option.exists(isConstant),
    );
    if (constant) {
      fail(at, `constant expression ${quote(trimmed)} in condition. remove the if: section`);
    }
  };

const checkPlaceholder =
  (fail: Fail) =>
  (condition: Text, start: number, end: number): void => {
    const { value } = condition;
    const extra =
      start > START || end + CLOSE.length < value.length || Str.split(OPEN)(value).length > SINGLE;
    if (extra) {
      fail(
        condition,
        `if: condition ${quote(value)} is always evaluated to true because extra characters are around \${{ }}`,
      );
      return;
    }
    checkExpression(fail)(condition, Str.slice(start + OPEN.length, end)(value));
  };

const checkCondition =
  (fail: Fail) =>
  (condition: Text | undefined): void => {
    for (const found of Option.toArray(Option.fromNullishOr(condition))) {
      Option.match(Option.all([Str.indexOf(OPEN)(found.value), Str.indexOf(CLOSE)(found.value)]), {
        onNone: () => {
          checkExpression(fail)(found, found.value);
        },
        onSome: ([start, end]) => {
          checkPlaceholder(fail)(found, start, end);
        },
      });
    }
  };

export const ifCond = workflowRule({
  description: "Reports if: conditions that are always true or constant",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#if-cond-constant",
  visitor: (fail): Visitor => ({
    ...NOOP,
    jobPre: (job) => {
      checkCondition(fail)(job.condition);
      for (const snapshot of Option.toArray(Option.fromNullishOr(job.snapshot))) {
        checkCondition(fail)(snapshot.condition);
      }
    },
    step: (step) => {
      checkCondition(fail)(step.condition);
    },
  }),
});
