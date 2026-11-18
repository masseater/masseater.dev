import { Array as Arr, Boolean as Bool, Option, pipe } from "effect";

import {
  at,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import {
  isReusableOnly,
  jobLocation,
  jobsOf,
  workflowLocation,
} from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import type { Permissions, BasePermission } from "#/features/audit-workflows/model/common.ts";
import type {
  Confidence,
  Persona,
  Severity,
  SymbolicLocation,
} from "#/features/audit-workflows/model/finding.ts";

const meta = { ident: "excessive-permissions", desc: "overly broad permissions" } as const;

const KNOWN: ReadonlyMap<string, Severity> = new Map<string, Severity>([
  ["actions", "high"],
  ["artifact-metadata", "medium"],
  ["attestations", "high"],
  ["checks", "medium"],
  ["code-quality", "medium"],
  ["contents", "high"],
  ["deployments", "high"],
  ["discussions", "medium"],
  ["id-token", "high"],
  ["issues", "high"],
  ["models", "low"],
  ["packages", "high"],
  ["pages", "high"],
  ["pull-requests", "high"],
  ["repository-projects", "medium"],
  ["security-events", "medium"],
  ["statuses", "low"],
]);

type Verdict = readonly [Severity, Confidence, SymbolicLocation];

const DEFAULT_PERMISSIONS = "default permissions used due to no permissions: block";

const isDefault = (permissions: Permissions): boolean =>
  permissions.type === "base" && permissions.base === "default";

const baseVerdict = (
  base: Exclude<BasePermission, "default">,
  location: SymbolicLocation,
): Verdict => {
  if (base === "read-all") {
    return [
      "medium",
      "high",
      annotated("uses read-all permissions")(withKeys("permissions")(location)),
    ];
  }
  return [
    "high",
    "high",
    annotated("uses write-all permissions")(withKeys("permissions")(location)),
  ];
};

const workflowVerdicts = (
  permissions: Permissions,
  location: SymbolicLocation,
): readonly Verdict[] => {
  if (permissions.type === "base") {
    if (permissions.base === "default") {
      return [["medium", "medium", annotated(DEFAULT_PERMISSIONS)(location)]];
    }
    return [baseVerdict(permissions.base, location)];
  }
  return pipe(
    [...permissions.permissions],
    Arr.filter(([, permission]) => permission === "write"),
    Arr.map(([name]): Verdict => [
      KNOWN.get(name) ?? "medium",
      "high",
      annotated(`${name}: write is overly broad at the workflow level`)(
        withKeys("permissions", name)(location),
      ),
    ]),
  );
};

const jobVerdict = (
  permissions: Permissions,
  explicitParent: boolean,
  location: SymbolicLocation,
): Option.Option<Verdict> => {
  if (permissions.type !== "base") {
    return Option.none();
  }
  if (permissions.base === "default") {
    return Option.liftPredicate<Verdict>(
      ["medium", "medium", annotated(DEFAULT_PERMISSIONS)(location)],
      () => !explicitParent,
    );
  }
  return Option.some(baseVerdict(permissions.base, location));
};

const SINGLE = 1;

const personaFor = (pedantic: boolean): Persona =>
  Bool.match(pedantic, { onTrue: () => "pedantic", onFalse: () => "regular" });

export const excessivePermissions: Audit = {
  ...meta,
  workflow: (workflow) => {
    const jobs = jobsOf(workflow);
    const allExplicit = pipe(
      jobs,
      Arr.every((job) => !isDefault(job.job.model.permissions)),
    );
    const explicitParent = !isDefault(workflow.model.permissions);
    const reusableOnly = isReusableOnly(workflow);
    const workflowPersona = personaFor(
      workflow.model.jobs.length === SINGLE || allExplicit || reusableOnly,
    );
    const workflowAt = primary(workflowLocation(workflow));
    const own = Arr.map(
      workflowVerdicts(workflow.model.permissions, workflowAt),
      ([level, certainty, location]) =>
        pipe(
          finding(meta),
          severity(level),
          confidence(certainty),
          persona(workflowPersona),
          at(location),
        ),
    );
    const perJob = pipe(
      jobs,
      Arr.flatMap((job) => {
        const location = jobLocation(job.job);
        const jobPersona = personaFor(job.type === "normal" && reusableOnly);
        return pipe(
          jobVerdict(job.job.model.permissions, explicitParent, location),
          Option.map(([level, certainty, permLocation]) =>
            pipe(
              finding(meta),
              severity(level),
              confidence(certainty),
              persona(jobPersona),
              at(location),
              at(primary(permLocation)),
            ),
          ),
          Option.toArray,
        );
      }),
    );
    return [...own, ...perJob];
  },
};
