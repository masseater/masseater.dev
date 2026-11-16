import { checkRepository } from "#/features/check-value-owners/index.ts";
import { namespaceDestructuringIn } from "#/features/source-code/find-namespace-destructuring/index.ts";
import { passThroughWrappersIn } from "#/features/source-code/find-pass-through-wrappers/index.ts";

/** @internal */
export const checkSources = (root: string): ReturnType<typeof checkRepository> =>
  checkRepository(root, [passThroughWrappersIn, namespaceDestructuringIn]);
