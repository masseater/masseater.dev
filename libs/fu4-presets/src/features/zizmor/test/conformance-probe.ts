import { defineRule } from "@r_masseater/fu4";
import type { RuleContext } from "@r_masseater/fu4";
import { Option, Result, Schema, String as Str } from "effect";

import { AUDITS } from "#/features/zizmor/concerns/index.ts";
import { primaryLocation } from "#/features/zizmor/lib/finding.ts";
import { inputOf } from "#/features/zizmor/lib/input.ts";
import { findingsOf } from "#/features/zizmor/lib/run.ts";
import { settingsOf } from "#/features/zizmor/lib/settings.ts";
import type { Finding } from "#/features/zizmor/model/finding.ts";

export const ExpectedFinding = Schema.Struct({
  ident: Schema.String,
  line: Schema.Finite,
  column: Schema.Finite,
  annotation: Schema.String,
  severity: Schema.String,
  confidence: Schema.String,
  persona: Schema.String,
});

export type Expected = typeof ExpectedFinding.Type;

const ProbeMessage = Schema.fromJsonString(
  Schema.Struct({ audit: Schema.String, index: Schema.Finite, finding: ExpectedFinding }),
);

const ONE_BASED = 1;
const FIRST = 1;

const titled = (word: string): string => Str.capitalize(word);

const rendered = (found: Finding): Expected => {
  const location = primaryLocation(found);
  return {
    ident: found.ident,
    line: location.concrete.start.row + ONE_BASED,
    column: location.concrete.start.column + ONE_BASED,
    annotation: location.symbolic.annotation,
    severity: titled(found.severity),
    confidence: titled(found.confidence),
    persona: titled(found.persona),
  };
};

const encodeMessage = (message: typeof ProbeMessage.Type): string =>
  Result.getOrThrow(Schema.encodeResult(ProbeMessage)(message));

export const expectedOf = (message: string): Expected =>
  Result.getOrThrow(Schema.decodeResult(ProbeMessage)(message)).finding;

export const probe = defineRule({
  meta: {
    description: "Runs every ported zizmor audit",
    kinds: ["workflow", "action", "dependabot", "pre-commit"],
  },
  check: (context: RuleContext) => {
    const settings = settingsOf(context.settings);
    if (Result.isFailure(settings)) {
      return;
    }
    for (const input of Option.toArray(inputOf(context.kind)(context.filename)(context.source))) {
      for (const audit of AUDITS) {
        const findings = findingsOf(audit)({
          input,
          settings: settings.success,
          project: context.project,
          parseScript: context.parseScript,
        });
        for (const [index, found] of findings.entries()) {
          const message = encodeMessage({ audit: audit.ident, index, finding: rendered(found) });
          context.report({ line: FIRST, column: FIRST, message });
        }
      }
    }
  },
});
