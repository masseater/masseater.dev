import type { Audit } from "#/features/zizmor/model/audit.ts";
import { impostorCommit } from "#/features/zizmor/rules/impostor-commit.ts";
import { knownVulnerableActions } from "#/features/zizmor/rules/known-vulnerable-actions.ts";
import { refConfusion } from "#/features/zizmor/rules/ref-confusion.ts";
import { refVersionMismatch } from "#/features/zizmor/rules/ref-version-mismatch.ts";
import { staleActionRefs } from "#/features/zizmor/rules/stale-action-refs.ts";

export const REFERENCES: readonly Audit[] = [
  impostorCommit,
  refConfusion,
  refVersionMismatch,
  staleActionRefs,
  knownVulnerableActions,
];
