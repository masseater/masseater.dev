import { Effect, Stdio, Stream } from "effect";

import { checksFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";

const writeTo = (
  sink: "stdout" | "stderr",
  text: string,
): Effect.Effect<void, never, Stdio.Stdio> =>
  Effect.gen(function* write() {
    const stdio = yield* Stdio.Stdio;
    yield* Stream.make(text).pipe(Stream.run(stdio[sink]()), Effect.orDie);
  });

const finish = (report: Report): Effect.Effect<void, VpToolsError, Stdio.Stdio> => {
  if (!report.valid) {
    return Effect.fail(checksFailed(report.output));
  }
  if (report.output === "") {
    return Effect.void;
  }
  return writeTo("stdout", `${report.output}\n`);
};

export { finish, writeTo };
