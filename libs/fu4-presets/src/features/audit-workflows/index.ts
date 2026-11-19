import { definePlugin } from "@r_masseater/fu4";
import type { Plugin } from "@r_masseater/fu4";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { AUDITS, CONCERNS } from "./concerns/index.ts";
import type { Concern } from "./concerns/index.ts";
import { auditRule } from "./lib/rule.ts";
import { settingsOf } from "./lib/settings.ts";
import type { Audit } from "./model/audit.ts";

const identsOf = (audits: readonly Audit[]): readonly string[] =>
  pipe(
    audits,
    Arr.map((audit) => audit.ident),
  );

const rulesOf = (audits: readonly Audit[]): Plugin["rules"] => {
  const ruleOf = auditRule(settingsOf(identsOf(audits)));
  return Rec.fromEntries(
    pipe(
      audits,
      Arr.map((audit) => [audit.ident, ruleOf(audit)] as const),
    ),
  );
};

export const zizmorPlugin = definePlugin({ rules: rulesOf(AUDITS) });

export const ZIZMOR_CONCERNS: Readonly<Record<Concern, readonly string[]>> = pipe(
  CONCERNS,
  Rec.map(identsOf),
);

export type { Concern } from "./concerns/index.ts";
export type { Confidence, Persona, Severity } from "./model/finding.ts";
