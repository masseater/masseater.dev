import { OverrideReportList, checkOverrides, removeOverride } from "@msch/core";
import type { OverrideReport } from "@msch/core";
import { Array as Arr, Effect, Option, Path, Schema, Stdio, pipe } from "effect";

import { JSON_FLAG, REMOVE_FLAG } from "./cli-contract.ts";
import { ProblemsFound, writeStdout } from "./output.ts";

const VALUE_OFFSET = 1;

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

const describeReport = (report: OverrideReport): string => {
  if (report.verdict === "unused") {
    return `${report.key}: unused. Removing it resolves every package the same way.`;
  }
  if (report.verdict === "keep") {
    const issues = pipe(
      [...report.advisories, ...report.peerIssues],
      Arr.map((issue) => `\n  ${issue}`),
      Arr.join(""),
    );
    return `${report.key}: keep. Removing it changes ${describeChanges(report)} and adds:${issues}`;
  }
  return `${report.key}: verify. Removing it changes ${describeChanges(report)} without new peer issues or advisories.`;
};

const reportText = (
  reports: readonly OverrideReport[],
): Effect.Effect<void, ProblemsFound, Stdio.Stdio> =>
  Effect.gen(function* report() {
    yield* writeStdout(
      pipe(
        reports,
        Arr.map((found) => `${describeReport(found)}\n`),
        Arr.join(""),
      ),
    );
    const unused = pipe(
      reports,
      Arr.filter((found) => found.verdict === "unused"),
    );
    if (Arr.isReadonlyArrayNonEmpty(unused)) {
      return yield* ProblemsFound.make({ count: unused.length });
    }
    return yield* Effect.void;
  });

const flagValue = (args: readonly string[], flag: string): Option.Option<string> =>
  pipe(
    Arr.findFirstIndex(args, (arg) => arg === flag),
    Option.flatMap((index) => Arr.get(args, index + VALUE_OFFSET)),
  );

const reportOverrides = Effect.fn("reportOverrides")(function* reportOverrides(
  root: string,
  args: readonly string[],
) {
  const reports = yield* checkOverrides(root);
  if (args.includes(JSON_FLAG)) {
    const text = yield* Schema.encodeEffect(Schema.fromJsonString(OverrideReportList))(reports);
    return yield* writeStdout(text);
  }
  return yield* reportText(reports);
});

/** @internal */
const overrides = Effect.gen(function* overrides() {
  const stdio = yield* Stdio.Stdio;
  const path = yield* Path.Path;
  const args = yield* stdio.args;
  const root = path.resolve(".");
  const removed = flagValue(args, REMOVE_FLAG);
  if (Option.isSome(removed)) {
    return yield* removeOverride(root, removed.value);
  }
  return yield* reportOverrides(root, args);
});

export { overrides };
