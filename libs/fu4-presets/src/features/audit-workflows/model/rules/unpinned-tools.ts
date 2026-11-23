import { Array as Arr, Option, pipe } from "effect";

import { configurable, field, usageOf } from "#/features/audit-workflows/lib/coordinate.ts";
import {
  at,
  atPath,
  confidence,
  finding,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  primary,
  withinText,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { ControlOrigin, Usage } from "#/features/audit-workflows/model/coordinate.ts";
import type { FindingDraft, Severity } from "#/features/audit-workflows/model/finding.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";

const meta = {
  ident: "unpinned-tools",
  desc: "action installs an unpinned external tool",
} as const;

const USES = withKeys("uses");

const COORDINATES = [
  ...Arr.map(["aquasecurity/setup-trivy", "1password/load-secrets-action"], (pattern) =>
    configurable(pattern)(field("opt-in")("version")({ type: "exact", items: ["latest"] })(true)),
  ),
  configurable("extractions/setup-just")(
    field("opt-in")("just-version")({ type: "exact", items: ["*"] })(true),
  ),
  configurable("extractions/setup-crate")(
    field("opt-in")("version")({ type: "exact", items: ["*"] })(true),
  ),
];

const fieldOf = (
  origins: readonly ControlOrigin[],
  type: "default" | "input",
): Option.Option<string> =>
  Arr.findFirst(origins, (origin) => {
    if (origin.type === type) {
      return Option.some(origin.field);
    }
    return Option.none();
  });

const draftOf = (view: StepView, raw: string, usage: Usage): Option.Option<FindingDraft> => {
  const uses = withinText(raw)(withKeys("uses")(view.location));
  const viaInput =
    (level: Exclude<Severity, "informational" | "medium">, annotation: string) =>
    (name: string): FindingDraft =>
      pipe(
        finding(meta),
        confidence(level),
        severity("medium"),
        at(annotated("this action")(uses)),
        atPath(view.location, primary, withKeys("with", name), annotated(annotation)),
      );
  if (usage.type === "always") {
    return Option.none();
  }
  if (usage.type === "conditional") {
    return Option.map(
      fieldOf(usage.origins, "input"),
      viaInput("low", "tool version may be unpinned"),
    );
  }
  return Option.match(fieldOf(usage.origins, "default"), {
    onSome: (name) => {
      const usesAt = withinText(raw);
      const omitted = annotated(`omitting \`${name}\` implicitly selects an unpinned tool version`);
      const located = atPath(view.location, primary, USES, usesAt, omitted);
      return Option.some(pipe(finding(meta), confidence("high"), severity("medium"), located));
    },
    onNone: () =>
      Option.map(
        fieldOf(usage.origins, "input"),
        viaInput("high", "selects an unpinned tool version"),
      ),
  });
};

const step = (view: StepView): Drafts => {
  const { body } = view;
  if (body.type !== "uses" || body.uses.type !== "repository") {
    return [];
  }
  const { raw } = body.uses;
  return pipe(
    Arr.findFirst(COORDINATES, (coordinate) => usageOf(coordinate)(view)),
    Option.flatMap((usage) => draftOf(view, raw, usage)),
    Option.toArray,
  );
};

export const unpinnedTools: Audit = { ...meta, step, compositeStep: step };
