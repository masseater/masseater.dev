import type { NamedCheck } from "./check.ts";
import { fallowCheck } from "./fallow-check.ts";
import { dependenciesCheck, steigerCheck } from "./repository-checks.ts";
import { betterleaksCheck } from "./secret-checks.ts";
import { commitlintCheck, markdownlintCheck, textlintCheck } from "./text-checks.ts";
import { actionlintCheck, zizmorCheck } from "./workflow-checks.ts";

const CHECKS: readonly NamedCheck[] = [
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

export { CHECKS };
