import { Effect, Array as Arr } from "effect";

import { withSection } from "#/entities/check/index.ts";
import { listDependencies } from "#/shared/lib/workspace.ts";

import { checkDependencies } from "./dependency-rules.ts";

/** @internal */
export const dependenciesCheck = withSection("dependencyRules", (rules, { root }) =>
  listDependencies(root).pipe(
    Effect.map((dependencies) => {
      const problems = checkDependencies(rules, dependencies);
      return { valid: Arr.isReadonlyArrayEmpty(problems), output: Arr.join(problems, "\n") };
    }),
  ),
);
