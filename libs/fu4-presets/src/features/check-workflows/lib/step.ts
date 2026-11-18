import { Option, pipe } from "effect";

import type { ExecAction, ExecRun, Step } from "#/entities/workflow/index.ts";

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

export const actionOf = (step: Step): Option.Option<ExecAction> =>
  pipe(
    Option.fromNullishOr(step.exec),
    Option.flatMap((exec) => {
      if (exec.type === "action") {
        return Option.some(exec);
      }
      return Option.none();
    }),
  );
