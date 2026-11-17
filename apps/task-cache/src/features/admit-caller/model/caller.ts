import { Effect, Option } from "effect";

import { setPublic } from "#/entities/entry/index.ts";

import { ciRunOf } from "./ci-run.ts";
import type { Target } from "./ci-run.ts";

export const admitsWriter = Effect.fn("admitCaller.admitsWriter")(function* admitsWriter(
  request: Request,
  target: Target,
) {
  const run = yield* ciRunOf(request, target);
  if (Option.isNone(run) || !run.value.defaultBranch) {
    return false;
  }
  yield* setPublic(target.namespace, run.value.publicRepository);
  return true;
});
