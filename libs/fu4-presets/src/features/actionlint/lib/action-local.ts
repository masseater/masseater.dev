import type { Project } from "@r_masseater/fu4";
import { Option, Result } from "effect";

import { findAction } from "#/entities/action/index.ts";
import type { ExecAction } from "#/entities/workflow/model/job-types.ts";
import type { Fail } from "#/features/actionlint/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { checkInputs } from "./action-inputs.ts";
import { checkMetadata } from "./action-metadata.ts";

export interface LocalActionEnv {
  readonly fail: Fail;
  readonly project: Project;
}

export const checkLocal =
  (env: LocalActionEnv) =>
  (uses: Text, exec: ExecAction): void => {
    for (const found of Option.toArray(findAction(env.project)(uses.value))) {
      if (Result.isFailure(found)) {
        env.fail(uses, found.failure);
      } else {
        const action = found.success;
        if (!action.cached) {
          checkMetadata({ fail: env.fail, project: env.project, action, uses });
        }
        const describe = `${quote(action.metadata.name)} defined at ${quote(uses.value)}`;
        checkInputs({ fail: env.fail, uses, describe })(action.metadata, exec);
      }
    }
  };
