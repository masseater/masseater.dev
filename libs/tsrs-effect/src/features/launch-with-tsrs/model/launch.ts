import { succeeds } from "@masseater.dev/github-workflow";
import { Array as Arr, Effect, Option, Schema } from "effect";

import { buildOf } from "#/shared/lib/host.ts";
import type { Host } from "#/shared/lib/host.ts";

const taggedError = Schema.TaggedError;

class NoCommand extends taggedError<NoCommand, { readonly brand: unique symbol }>()("NoCommand", {
  message: Schema.String,
}) {}

export interface Launch {
  readonly host: Host;
  readonly argv: readonly string[];
}

/** @internal */
export const launchWithTsrs = Effect.fn("launchWithTsrs")(function* launchWithTsrs({
  host,
  argv,
}: Launch) {
  const { binary } = yield* buildOf(host);
  const { command, args } = yield* Effect.fromOption(
    Arr.matchLeft(argv, {
      onEmpty: () => Option.none(),
      onNonEmpty: (head, tail) => Option.some({ command: head, args: tail }),
    }),
  ).pipe(Effect.mapError(() => NoCommand.make({ message: "usage: tsrs-effect <command> [args]" })));
  return yield* succeeds({ command, args, env: { TSRS_BINARY: binary } });
});
