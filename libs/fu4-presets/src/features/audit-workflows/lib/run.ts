import { Array as Arr, Effect, Option, Result, pipe } from "effect";

import type { Audit, AuditContext } from "#/features/audit-workflows/model/audit.ts";
import { SEVERITIES } from "#/features/audit-workflows/model/finding.ts";
import type { Finding } from "#/features/audit-workflows/model/finding.ts";
import type { AuditInput } from "#/features/audit-workflows/model/input.ts";

import { configIgnores, disables, severityRemap } from "./config.ts";
import { runAudit } from "./dispatch.ts";
import { build } from "./finding.ts";
import { pending } from "./produced.ts";
import { CONFIDENCES, PERSONAS } from "./settings.ts";
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

export interface AuditRun extends Omit<AuditContext, "config"> {
  readonly input: AuditInput;
  readonly settings: ZizmorSettings;
}

export const findingsOf =
  (audit: Audit) =>
  ({ input, settings, ...context }: AuditRun): Effect.Effect<readonly Finding[]> => {
    if (disables(settings.config)(audit.ident)) {
      return Effect.succeed([]);
    }
    const drafts = runAudit(audit)(input)({ config: settings.config, ...context });
    return Effect.map(pending(drafts), (all) =>
      pipe(
        all,
        Arr.map(build(input.document)),
        Result.all,
        Result.getOrElse((): readonly Finding[] => []),
        Arr.map((found) => remapped(settings, found)),
        Arr.filter(visible(settings, input)),
      ),
    );
  };
