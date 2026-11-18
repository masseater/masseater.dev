import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { adhocPackages } from "#/features/audit-workflows/rules/adhoc-packages.ts";
import { archivedUses } from "#/features/audit-workflows/rules/archived-uses.ts";
import { forbiddenUses } from "#/features/audit-workflows/rules/forbidden-uses.ts";
import { selfRepository } from "#/features/audit-workflows/rules/self-repository.ts";
import { superfluousActions } from "#/features/audit-workflows/rules/superfluous-actions.ts";
import { typosquatUses } from "#/features/audit-workflows/rules/typosquat-uses.ts";
import { unpinnedImages } from "#/features/audit-workflows/rules/unpinned-images.ts";
import { unpinnedTools } from "#/features/audit-workflows/rules/unpinned-tools.ts";
import { unpinnedUses } from "#/features/audit-workflows/rules/unpinned-uses.ts";

export const SUPPLY_CHAIN: readonly Audit[] = [
  unpinnedUses,
  unpinnedImages,
  unpinnedTools,
  forbiddenUses,
  archivedUses,
  typosquatUses,
  superfluousActions,
  selfRepository,
  adhocPackages,
];
