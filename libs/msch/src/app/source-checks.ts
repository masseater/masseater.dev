import { passThroughWrappersIn } from "#/features/pass-through-wrappers/index.ts";
import { checkRepository } from "#/features/value-owners/index.ts";

/** @internal */
export const checkSources = (root: string): ReturnType<typeof checkRepository> =>
  checkRepository(root, [passThroughWrappersIn]);
