import { Array as Arr, Option, pipe } from "effect";

import type { OverrideKey, OverrideReport } from "./override-resolution.ts";
import type { Problem } from "./problem.ts";

const describeVersions = (versions: readonly string[]): string =>
  Option.getOrElse(
    Option.liftPredicate(Arr.join(versions, ","), (joined) => joined !== ""),
    () => "-",
  );

const describeChanges = (report: OverrideReport): string => {
  const versions = pipe(
    report.changes,
    Arr.map(
      (change) =>
        `${change.name} ${describeVersions(change.before)} -> ${describeVersions(change.after)}`,
    ),
  );
  const contexts = Arr.filter(["the peer contexts"], () => report.peerContextsChanged);
  return Arr.join([...versions, ...contexts], "; ");
};

interface LocatedOverride extends OverrideKey {
  readonly file: string;
}

const overrideProblem =
  (located: LocatedOverride) =>
  (report: OverrideReport): Option.Option<Problem> => {
    const at = { file: located.file, line: located.line, column: located.column };
    if (report.verdict === "unused") {
      return Option.some({
        ...at,
        rule: "unused-override",
        message: `Every package resolves the same way without the override ${report.key}. Remove it.`,
      });
    }
    if (report.verdict === "verify") {
      return Option.some({
        ...at,
        rule: "removable-override",
        message: `Removing the override ${report.key} changes ${describeChanges(report)} without new peer issues or advisories. Remove it and run verify.`,
      });
    }
    return Option.none();
  };

export { overrideProblem };
