import { Array as Arr, Result, pipe } from "effect";

import {
  at,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  concretize,
  isMeaningful,
  primary,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import { jobLocation, jobsOf, workflowLocation } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { Permissions } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { Document } from "#/shared/yamlpath/index.ts";

const meta = {
  ident: "undocumented-permissions",
  desc: "permissions without explanatory comments",
} as const;

const documented =
  (document: Document) =>
  (location: SymbolicLocation): boolean =>
    pipe(
      concretize(document)(location),
      Result.map((found) => pipe(found.concrete.comments, Arr.some(isMeaningful))),
      Result.getOrElse(() => false),
    );

const NONE = 0;

const check = (
  document: Document,
  permissions: Permissions,
  location: SymbolicLocation,
): Drafts => {
  if (permissions.type !== "explicit" || permissions.permissions.size === NONE) {
    return [];
  }
  const base = primary(location);
  const undocumented = pipe(
    [...permissions.permissions],
    Arr.filter(([name, permission]) => !(name === "contents" && permission === "read")),
    Arr.map(([name]) => withKeys("permissions", name)(base)),
    Arr.filter((each) => !documented(document)(each)),
    Arr.map(annotated("needs an explanatory comment")),
  );
  if (Arr.isReadonlyArrayEmpty(undocumented)) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      severity("low"),
      confidence("high"),
      persona("pedantic"),
      at(...undocumented),
    ),
  ];
};

export const undocumentedPermissions: Audit = {
  ...meta,
  workflow: (workflow) => [
    ...check(workflow.document, workflow.model.permissions, workflowLocation(workflow)),
    ...Arr.flatMap(jobsOf(workflow), (job) =>
      check(workflow.document, job.job.model.permissions, jobLocation(job.job)),
    ),
  ],
};
