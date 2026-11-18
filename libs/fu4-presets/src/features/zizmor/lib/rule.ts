import { defineRule } from "@r_masseater/fu4";
import type { Rule, RuleContext } from "@r_masseater/fu4";
import { Effect, Option, Result } from "effect";

import type { Audit } from "#/features/zizmor/model/audit.ts";

import { message, primaryLocation } from "./finding.ts";
import { inputOf } from "./input.ts";
import { findingsOf } from "./run.ts";
import { settingsOf } from "./settings.ts";

const ONE_BASED = 1;

const KINDS = ["workflow", "action", "dependabot", "pre-commit"] as const;

const check =
  (audit: Audit) =>
  (context: RuleContext): Effect.Effect<void> => {
    const settings = settingsOf(context.settings);
    if (Result.isFailure(settings)) {
      return Effect.die(new Error(`invalid zizmor settings: ${settings.failure}`));
    }
    for (const input of Option.toArray(inputOf(context.kind)(context.filename)(context.source))) {
      for (const found of findingsOf(audit)({
        input,
        settings: settings.success,
        project: context.project,
        parseScript: context.parseScript,
      })) {
        const { start } = primaryLocation(found).concrete;
        context.report({
          line: start.row + ONE_BASED,
          column: start.column + ONE_BASED,
          message: message(found),
        });
      }
    }
    return Effect.void;
  };

export const auditRule = (audit: Audit): Rule =>
  defineRule({
    meta: {
      description: audit.desc,
      docs: `https://docs.zizmor.sh/audits/#${audit.ident}`,
      kinds: KINDS,
    },
    check: check(audit),
  });
