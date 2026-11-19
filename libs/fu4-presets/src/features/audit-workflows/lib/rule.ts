import { defineRule, INPUT_KINDS } from "@r_masseater/fu4";
import type { Rule, RuleContext } from "@r_masseater/fu4";
import { Array as Arr, Effect, Option, Result } from "effect";

import { githubFor } from "#/features/audit-workflows/api/index.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import type { Finding } from "#/features/audit-workflows/model/finding.ts";
import type { GitHubClient } from "#/features/audit-workflows/model/github.ts";

import { message, primaryColumn, primaryLocation } from "./finding.ts";
import { inputOf } from "./input.ts";
import { findingsOf } from "./run.ts";
import { settingsOf } from "./settings.ts";
import type { ZizmorSettings } from "./settings.ts";

const ONE_BASED = 1;
const UNBOUNDED = { concurrency: "unbounded" } as const;

const githubOf = (
  settings: ZizmorSettings,
  root: string,
): Effect.Effect<Option.Option<GitHubClient>> => {
  if (!settings.online) {
    return Effect.succeedNone;
  }
  return githubFor(settings.githubHost)(root);
};

const audited =
  (audit: Audit, context: RuleContext) =>
  (settings: ZizmorSettings): Effect.Effect<readonly (readonly Finding[])[]> =>
    Effect.flatMap(githubOf(settings, context.project.root), (github) =>
      Effect.forEach(
        Option.toArray(inputOf(context.kind)(context.filename)(context.source)),
        (input) =>
          findingsOf(audit)({
            input,
            settings,
            project: context.project,
            parseScript: context.parseScript,
            github,
          }),
        UNBOUNDED,
      ),
    );

const reported =
  (context: RuleContext) =>
  (found: readonly (readonly Finding[])[]): void => {
    for (const each of Arr.flatten(found)) {
      const { start } = primaryLocation(each).concrete;
      context.report({
        line: start.row + ONE_BASED,
        column: primaryColumn(context.source.text)(each) + ONE_BASED,
        message: message(each),
      });
    }
  };

const check =
  (audit: Audit) =>
  (context: RuleContext): Effect.Effect<void> => {
    const settings = settingsOf(context.settings);
    if (Result.isFailure(settings)) {
      return Effect.die(new Error(`invalid zizmor settings: ${settings.failure}`));
    }
    return audited(audit, context)(settings.success).pipe(Effect.map(reported(context)));
  };

export const auditRule = (audit: Audit): Rule =>
  defineRule({
    meta: {
      description: audit.desc,
      docs: `https://docs.zizmor.sh/audits/#${audit.ident}`,
      kinds: INPUT_KINDS,
    },
    check: check(audit),
  });
