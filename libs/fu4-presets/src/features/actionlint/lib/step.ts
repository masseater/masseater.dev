import { Option, pipe } from "effect";

import type { ExecRun, Step } from "#/entities/workflow/model/job-types.ts";

export const runOf = (step: Step): Option.Option<ExecRun> =>
  pipe(
    Option.fromNullishOr(step.exec),
    Option.flatMap((exec) => {
      if (exec.type === "run") {
        return Option.some(exec);
      }
      return Option.none();
    }),
  );
