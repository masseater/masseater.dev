import type { NamedCheck } from "#/entities/check/index.ts";
import { dependenciesCheck, steigerCheck } from "#/features/check-repository/index.ts";
import { actionlintCheck, zizmorCheck } from "#/features/check-workflows/index.ts";
import { commitlintCheck, markdownlintCheck, textlintCheck } from "#/features/lint-text/index.ts";
import { fallowCheck } from "#/features/run-fallow/index.ts";
import { betterleaksCheck } from "#/features/scan-secrets/index.ts";

export const CHECKS: readonly NamedCheck[] = [
  { name: "betterleaks", run: betterleaksCheck },
  { name: "commitlint", run: commitlintCheck },
  { name: "actionlint", run: actionlintCheck },
  { name: "zizmor", run: zizmorCheck },
  { name: "dependencies", run: dependenciesCheck },
  { name: "steiger", run: steigerCheck },
  { name: "textlint", run: textlintCheck },
  { name: "markdownlint", run: markdownlintCheck },
  { name: "fallow", run: fallowCheck },
];
