import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { impostorCommit } from "#/features/audit-workflows/model/rules/impostor-commit.ts";
import { knownVulnerableActions } from "#/features/audit-workflows/model/rules/known-vulnerable-actions.ts";
import { refConfusion } from "#/features/audit-workflows/model/rules/ref-confusion.ts";
import { refVersionMismatch } from "#/features/audit-workflows/model/rules/ref-version-mismatch.ts";
import { staleActionRefs } from "#/features/audit-workflows/model/rules/stale-action-refs.ts";

export const REFERENCES: readonly Audit[] = [
  impostorCommit,
  refConfusion,
  refVersionMismatch,
  staleActionRefs,
  knownVulnerableActions,
];
