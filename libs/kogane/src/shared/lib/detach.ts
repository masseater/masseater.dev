import { Effect } from "effect";
import { ChildProcess } from "effect/process";

/** @internal */
export const runDetached = Effect.fn("runDetached")(function* runDetached(args: readonly string[]) {
  const handle = yield* ChildProcess.make(process.execPath, [import.meta.filename, ...args], {
    detached: true,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  yield* Effect.asVoid(handle.unref);
}, Effect.scoped);
