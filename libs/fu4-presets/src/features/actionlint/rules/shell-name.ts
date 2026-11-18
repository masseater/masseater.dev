import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import { containsExpression } from "#/entities/workflow/index.ts";
import type { Runner } from "#/entities/workflow/model/job-types.ts";
import type { Defaults } from "#/entities/workflow/model/types.ts";
import { runOf } from "#/features/actionlint/lib/step.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import shells from "#/shared/data/shells.json" with { type: "json" };
import { quote, sortedQuotes } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

type Platform = "any" | "unix" | "windows";

const SHELLS: Readonly<Record<"unix" | "windows", readonly string[]>> = shells;
const AVAILABLE: Readonly<Record<Platform, readonly string[]>> = {
  unix: Arr.dedupe(Arr.sort(SHELLS.unix, Order.String)),
  windows: Arr.dedupe(Arr.sort(SHELLS.windows, Order.String)),
  any: Arr.dedupe(Arr.sort([...SHELLS.unix, ...SHELLS.windows], Order.String)),
};
const ON: Readonly<Record<Platform, string>> = {
  any: "",
  unix: " on macOS or Linux",
  windows: " on Windows",
};
const WINDOWS = /^windows(?:-|$)/u;
const UNIX = /^(?:macos-|ubuntu-|macos$|linux$)/u;

const kindOf = (label: Text): Option.Option<Platform> => {
  const lower = Str.toLowerCase(label.value);
  if (WINDOWS.test(lower)) {
    return Option.some("windows");
  }
  if (UNIX.test(lower)) {
    return Option.some("unix");
  }
  return Option.none();
};

export const platformOf = (runner: Runner): Platform => {
  let found: Platform = "any";
  const kinds = pipe(
    runner.labels,
    Arr.map((label) => kindOf(label)),
    Arr.getSomes,
  );
  for (const kind of kinds) {
    if (found !== "any" && found !== kind) {
      return "any";
    }
    found = kind;
  }
  return found;
};

const isAccepted = (value: string, names: readonly string[]): boolean =>
  Str.includes("{0}")(value) ||
  containsExpression(value) ||
  Arr.contains(names, Str.toLowerCase(value));

const check =
  (fail: Fail, platform: Platform) =>
  (shell: Text | undefined): void => {
    const invalid = pipe(
      Option.fromNullishOr(shell),
      Option.filter((found) => !isAccepted(found.value, AVAILABLE[platform])),
    );
    for (const found of Option.toArray(invalid)) {
      const name = Str.toLowerCase(found.value);
      const names = AVAILABLE[platform];
      const on = pipe(
        ON[platform],
        Option.liftPredicate(() => Arr.contains(AVAILABLE.any, name)),
        Option.getOrElse(() => ""),
      );
      fail(
        found,
        `shell name ${quote(found.value)} is invalid${on}. available names are ${sortedQuotes(names)}`,
      );
    }
  };

const defaultShell = (defaults: Defaults | undefined): Text | undefined =>
  pipe(
    Option.fromNullishOr(defaults),
    Option.flatMap((found) => Option.fromNullishOr(found.run)),
    Option.flatMap((run) => Option.fromNullishOr(run.shell)),
    Option.getOrUndefined,
  );

export const shellName = workflowRule({
  description: "Reports shell names that the runner does not provide",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-shell-names",
  visitor: (fail): Visitor => {
    let platform: Platform = "any";
    return {
      ...NOOP,
      workflowPre: (workflow) => {
        check(fail, platform)(defaultShell(workflow.defaults));
      },
      jobPre: (job) => {
        for (const runner of Option.toArray(Option.fromNullishOr(job.runsOn))) {
          platform = platformOf(runner);
          check(fail, platform)(defaultShell(job.defaults));
        }
      },
      step: (step) => {
        for (const run of Option.toArray(runOf(step))) {
          check(fail, platform)(run.shell);
        }
      },
      jobPost: () => {
        platform = "any";
      },
    };
  },
});
