import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { adhocPackages } from "#/features/audit-workflows/model/rules/adhoc-packages.ts";
import { archivedUses } from "#/features/audit-workflows/model/rules/archived-uses.ts";
import { forbiddenUses } from "#/features/audit-workflows/model/rules/forbidden-uses.ts";
import { selfRepository } from "#/features/audit-workflows/model/rules/self-repository.ts";
import { superfluousActions } from "#/features/audit-workflows/model/rules/superfluous-actions.ts";
import { typosquatUses } from "#/features/audit-workflows/model/rules/typosquat-uses.ts";
import { unpinnedImages } from "#/features/audit-workflows/model/rules/unpinned-images.ts";
import { unpinnedTools } from "#/features/audit-workflows/model/rules/unpinned-tools.ts";
import { unpinnedUses } from "#/features/audit-workflows/model/rules/unpinned-uses.ts";

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
