import type { NamedCheck } from "#/entities/check/index.ts";
import { dependenciesCheck, steigerCheck } from "#/features/check-repository/index.ts";
import { commitlintCheck, textlintCheck } from "#/features/check-text/index.ts";
import { actionlintCheck, zizmorCheck } from "#/features/check-workflows/index.ts";
import { fallowCheck } from "#/features/run-fallow/index.ts";
import { h56mCheck } from "#/features/scan-secrets/index.ts";

export const CHECKS: readonly NamedCheck[] = [
  { name: "h56m", run: h56mCheck },
  { name: "commitlint", run: commitlintCheck },
  { name: "actionlint", run: actionlintCheck },
  { name: "zizmor", run: zizmorCheck },
  { name: "dependencies", run: dependenciesCheck },
  { name: "steiger", run: steigerCheck },
  { name: "textlint", run: textlintCheck },
  { name: "fallow", run: fallowCheck },
];
