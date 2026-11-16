import { namespaceDestructuringIn } from "#/features/source-code/namespace-destructuring/index.ts";
import { passThroughWrappersIn } from "#/features/source-code/pass-through-wrappers/index.ts";
import { checkRepository } from "#/features/value-owners/index.ts";

/** @internal */
export const checkSources = (root: string): ReturnType<typeof checkRepository> =>
  checkRepository(root, [passThroughWrappersIn, namespaceDestructuringIn]);
