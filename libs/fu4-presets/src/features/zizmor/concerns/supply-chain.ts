import type { Audit } from "#/features/zizmor/model/audit.ts";
import { adhocPackages } from "#/features/zizmor/rules/adhoc-packages.ts";
import { archivedUses } from "#/features/zizmor/rules/archived-uses.ts";
import { forbiddenUses } from "#/features/zizmor/rules/forbidden-uses.ts";
import { selfRepository } from "#/features/zizmor/rules/self-repository.ts";
import { superfluousActions } from "#/features/zizmor/rules/superfluous-actions.ts";
import { typosquatUses } from "#/features/zizmor/rules/typosquat-uses.ts";
import { unpinnedImages } from "#/features/zizmor/rules/unpinned-images.ts";
import { unpinnedTools } from "#/features/zizmor/rules/unpinned-tools.ts";
import { unpinnedUses } from "#/features/zizmor/rules/unpinned-uses.ts";

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
