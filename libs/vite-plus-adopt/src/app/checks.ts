import type { NamedCheck } from "#/entities/check/index.ts";
import { dependenciesCheck, steigerCheck } from "#/features/check-repository/index.ts";
import { commitlintCheck, textlintCheck } from "#/features/check-text/index.ts";
import { fallowCheck } from "#/features/run-fallow/index.ts";
import { betterleaksCheck } from "#/features/scan-secrets/index.ts";

export const CHECKS: readonly NamedCheck[] = [
  { name: "betterleaks", run: betterleaksCheck },
  { name: "commitlint", run: commitlintCheck },
  { name: "dependencies", run: dependenciesCheck },
  { name: "steiger", run: steigerCheck },
  { name: "textlint", run: textlintCheck },
  { name: "fallow", run: fallowCheck },
];
