import { Array as Arr, Option, String as Str, pipe } from "effect";

import { containsExpression } from "#/entities/workflow/index.ts";
import type { Job, Matrix } from "#/entities/workflow/model/job-types.ts";
import { labelsInMatrix } from "#/features/actionlint/lib/matrix-labels.ts";
import {
  INVALID,
  KNOWN_LABELS,
  SELF_OTHER,
  compatOf,
  overlaps,
} from "#/features/actionlint/lib/runners.ts";
import type { Compat } from "#/features/actionlint/lib/runners.ts";
import { settingsOf } from "#/features/actionlint/lib/settings.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import { pathMatch } from "#/shared/glob/index.ts";
import { quote, quotes } from "#/shared/text/index.ts";
import { describePosition } from "#/shared/yaml/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const CONFIG_NAME = "the fu4 section of vite.config.ts";
const SINGLE = 1;

interface Seen {
  readonly compat: Compat;
  readonly label: Text;
}

const verifier =
  (fail: Fail, known: readonly string[]) =>
  (label: Text): Compat => {
    const found = compatOf(label.value);
    if (Option.isSome(found)) {
      return found.value;
    }
    const lower = Str.toLowerCase(label.value);
    const isOther = pipe(
      SELF_OTHER,
      Arr.some((other) => Str.toLowerCase(other) === lower),
    );
    const isKnown = pipe(
      known,
      Arr.some((pattern) => pathMatch(pattern)(label.value)),
    );
    if (isOther || isKnown) {
      return INVALID;
    }
    fail(
      label,
      `label ${quote(label.value)} is unknown. available labels are ${quotes([...KNOWN_LABELS, ...known])}. if it is a custom label for self-hosted runner, set list of labels in ${CONFIG_NAME}`,
    );
    return INVALID;
  };

const isValid = (compat: Compat): boolean => Arr.isReadonlyArrayNonEmpty(compat);

const sameCompat =
  (left: Compat) =>
  (right: Compat): boolean =>
    left.length === right.length &&
    overlaps(left)(right) &&
    pipe(
      left,
      Arr.every((image) => Arr.contains(right, image)),
    );

interface Tracker {
  readonly conflictFree: (compat: Compat, label: Text) => boolean;
  readonly remember: (compat: Compat, label: Text) => void;
}

const trackerOf = (fail: Fail): Tracker => {
  const seen: Seen[] = [];
  return {
    conflictFree: (compat, label) => {
      const previous = pipe(
        seen,
        Arr.findFirst((each) => !overlaps(each.compat)(compat)),
      );
      for (const found of Option.toArray(previous)) {
        fail(
          label,
          `label ${quote(label.value)} conflicts with label ${quote(found.label.value)} defined at ${describePosition(found.label)}. note: to run your job on each workers, use matrix`,
        );
      }
      return Option.isNone(previous);
    },
    remember: (compat, label) => {
      const known = pipe(
        seen,
        Arr.some((each) => sameCompat(each.compat)(compat)),
      );
      if (!known) {
        seen.push({ compat, label });
      }
    },
  };
};

interface Checker {
  readonly verify: (label: Text) => Compat;
  readonly matrix: Option.Option<Matrix>;
  readonly tracker: Tracker;
}

const checkExpression = (checker: Checker, label: Text): void => {
  const labels = labelsInMatrix(checker.matrix)(label);
  const compats = pipe(
    labels,
    Arr.map((each) => checker.verify(each)),
    Arr.zip(labels),
    Arr.map(([compat, each]): Compat => {
      if (isValid(compat) && !checker.tracker.conflictFree(compat, each)) {
        return INVALID;
      }
      return compat;
    }),
  );
  for (const [compat, each] of Arr.zip(compats, labels)) {
    if (isValid(compat)) {
      checker.tracker.remember(compat, each);
    }
  }
};

const checkLabel =
  (checker: Checker) =>
  (label: Text): void => {
    if (containsExpression(label.value)) {
      checkExpression(checker, label);
      return;
    }
    const compat = checker.verify(label);
    if (isValid(compat) && checker.tracker.conflictFree(compat, label)) {
      checker.tracker.remember(compat, label);
    }
  };

const matrixOf = (job: Job): Option.Option<Matrix> =>
  pipe(
    Option.fromNullishOr(job.strategy),
    Option.flatMap((strategy) => Option.fromNullishOr(strategy.matrix)),
  );

const checkSingle = (checker: Checker, label: Text): void => {
  if (containsExpression(label.value)) {
    for (const found of labelsInMatrix(checker.matrix)(label)) {
      checker.verify(found);
    }
    return;
  }
  checker.verify(label);
};

const checkJob =
  (fail: Fail, known: readonly string[]) =>
  (job: Job): void => {
    for (const runner of Option.toArray(Option.fromNullishOr(job.runsOn))) {
      const checker: Checker = {
        verify: verifier(fail, known),
        matrix: matrixOf(job),
        tracker: trackerOf(fail),
      };
      if (runner.labels.length === SINGLE) {
        for (const single of runner.labels) {
          checkSingle(checker, single);
        }
        return;
      }
      const labels = Option.match(Option.fromNullishOr(runner.labelsExpression), {
        onNone: () => runner.labels,
        onSome: (expression) => [expression],
      });
      for (const label of labels) {
        checkLabel(checker)(label);
      }
    }
  };

export const runnerLabel = workflowRule({
  description: "Reports runs-on labels that no runner provides and labels that cannot run together",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-runner-labels",
  visitor: (fail, context): Visitor => ({
    ...NOOP,
    jobPre: checkJob(fail, settingsOf(context).runnerLabels),
  }),
});
