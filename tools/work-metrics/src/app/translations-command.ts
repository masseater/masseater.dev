import { Effect, Schema } from "effect";
import { Command } from "effect/cli";

import { fixesSummary, translationFixes } from "#/features/count-translation-fixes/index.ts";
import { writeReport } from "#/shared/lib/output.ts";

import { daysFlag, outFlag, repoFlag } from "./flags.ts";
import { acrossRepositories } from "./repositories.ts";

const FixesRow = Schema.Struct({
  repository: Schema.String,
  number: Schema.Finite,
  files: Schema.Array(Schema.String),
  translatedLines: Schema.Finite,
  fixedLines: Schema.Finite,
  hunks: Schema.Finite,
  percent: Schema.Finite,
});

const collect = acrossRepositories(translationFixes);

const runTranslations = Effect.fn("command.translations")(function* runTranslations(
  input: Readonly<{ repo: readonly string[]; days: number; out: string }>,
) {
  const fixes = yield* collect(input);
  yield* writeReport({
    out: input.out,
    name: "translations",
    codec: Schema.Array(FixesRow),
    value: fixes,
    summary: `## Hand fixes after PLaMo, last ${String(input.days)} days\n\n${fixesSummary(fixes)}\n`,
  });
});

/** @internal */
export const translationsCommand = Command.make(
  "translations",
  { repo: repoFlag, days: daysFlag, out: outFlag },
  runTranslations,
);
