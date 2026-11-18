import type { Project } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, pipe } from "effect";

import type { Audit } from "#/features/zizmor/model/audit.ts";
import type { Finding } from "#/features/zizmor/model/finding.ts";
import type { AuditInput } from "#/features/zizmor/model/input.ts";

import { configIgnores, disables, severityRemap } from "./config.ts";
import { runAudit } from "./dispatch.ts";
import { build } from "./finding.ts";
import type { ScriptParser } from "./script.ts";
import { CONFIDENCES, PERSONAS, SEVERITIES } from "./settings.ts";
import type { ZizmorSettings } from "./settings.ts";

const below = <Value>(
  order: readonly Value[],
  minimum: Option.Option<Value>,
  value: Value,
): boolean => Option.exists(minimum, (each) => order.indexOf(each) > order.indexOf(value));

const remapped = (settings: ZizmorSettings, found: Finding): Finding => ({
  ...found,
  severity: Option.getOrElse(severityRemap(settings.config)(found), () => found.severity),
});

const visible =
  (settings: ZizmorSettings, input: AuditInput) =>
  (found: Finding): boolean =>
    !(
      PERSONAS.indexOf(settings.persona) > PERSONAS.indexOf(found.persona) ||
      found.ignored ||
      configIgnores(settings.config)(input.filename)(found) ||
      below(SEVERITIES, settings.minSeverity, found.severity) ||
      below(CONFIDENCES, settings.minConfidence, found.confidence)
    );

export interface AuditRun {
  readonly input: AuditInput;
  readonly settings: ZizmorSettings;
  readonly project: Project;
  readonly parseScript: ScriptParser;
}

export const findingsOf =
  (audit: Audit) =>
  ({ input, settings, project, parseScript }: AuditRun): readonly Finding[] => {
    if (disables(settings.config)(audit.ident)) {
      return [];
    }
    const drafts = runAudit(audit)(input)({
      config: settings.config,
      online: settings.online,
      project,
      parseScript,
    });
    return pipe(
      drafts,
      Arr.map(build(input.document)),
      Result.all,
      Result.getOrElse((): readonly Finding[] => []),
      Arr.map((found) => remapped(settings, found)),
      Arr.filter(visible(settings, input)),
    );
  };
