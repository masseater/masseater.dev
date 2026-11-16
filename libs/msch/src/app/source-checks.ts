import { checkRepository } from "#/features/check-value-owners/index.ts";
import { passThroughWrappersIn } from "#/features/find-pass-through-wrappers/index.ts";

/** @internal */
export const checkSources = (root: string): ReturnType<typeof checkRepository> =>
  checkRepository(root, [passThroughWrappersIn]);
