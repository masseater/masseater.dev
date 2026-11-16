import { Array as Arr, Effect, pipe } from "effect";

import type { SkillSelection } from "#/shared/config/index.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

/** @internal */
export interface Selecting {
  readonly label: string;
  readonly skills: SkillSelection;
}

/** @internal */
export const selectSkills =
  ({ label, skills }: Selecting) =>
  (available: readonly string[]): Effect.Effect<readonly string[], VpToolsError> => {
    if (skills === "all") {
      return Effect.succeed(available);
    }
    const missing = pipe(
      skills,
      Arr.filter((name) => !Arr.contains(available, name)),
    );
    if (Arr.isReadonlyArrayNonEmpty(missing)) {
      return Effect.fail(
        checksFailed(
          `${label} has no skill named ${Arr.join(missing, ", ")}. It has: ${Arr.join(available, ", ")}`,
        ),
      );
    }
    return Effect.succeed(skills);
  };
