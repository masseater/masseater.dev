import type { RepoView } from "#/features/zizmor/model/audit.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";

import { annotated, rootLocation, withKeys } from "./location.ts";

export const repoLocation = (repo: RepoView): SymbolicLocation =>
  annotated("this repo")(withKeys("repos", repo.index)(rootLocation("this pre-commit config")));

export const repoLocationWithGrip = (repo: RepoView): SymbolicLocation =>
  withKeys("repo")(repoLocation(repo));
