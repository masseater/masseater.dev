import { Array as Arr, Clock, Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";

import { fixesSummary, translationFixes } from "#/features/translation-fixes/index.ts";
import { repositoryOf } from "#/shared/api/pulls.ts";
import { sinceDays, writeReport } from "#/shared/lib/output.ts";

import { daysFlag, outFlag } from "./flags.ts";

const MINIMUM_REPOSITORIES = 1;

const FixesRow = Schema.Struct({
  repository: Schema.String,
  number: Schema.Finite,
  files: Schema.Array(Schema.String),
  translatedLines: Schema.Finite,
  fixedLines: Schema.Finite,
  hunks: Schema.Finite,
  percent: Schema.Finite,
});

const runTranslations = Effect.fn("command.translations")(function* runTranslations({
  repo,
  days,
  out,
}: Readonly<{ repo: readonly string[]; days: number; out: string }>) {
  const now = yield* Clock.currentTimeMillis;
  const since = sinceDays(days)(now);
  const found = yield* Effect.forEach(repo, (name) => translationFixes(repositoryOf(name), since), {
    concurrency: 1,
  });
  const fixes = Arr.flatten(found);
  yield* writeReport({
    out,
    name: "translations",
    codec: Schema.Array(FixesRow),
    value: fixes,
    summary: `## Hand fixes after PLaMo, last ${String(days)} days\n\n${fixesSummary(fixes)}\n`,
  });
});

/** @internal */
export const translationsCommand = Command.make(
  "translations",
  {
    repo: Flag.String("repo").pipe(Flag.atLeast(MINIMUM_REPOSITORIES)),
    days: daysFlag,
    out: outFlag,
  },
  runTranslations,
);
