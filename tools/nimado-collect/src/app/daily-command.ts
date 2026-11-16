import { Effect } from "effect";
import { Command, Flag } from "effect/cli";

import { publish } from "#/features/publish-views/index.ts";
import { restoreState, saveState } from "#/features/release-state/index.ts";

import { collectAll, stateFlag } from "./commands.ts";

/** @internal */
export const dailyCommand = Command.make(
  "daily",
  { state: stateFlag, out: Flag.String("out") },
  Effect.fn("command.daily")(function* daily({ state, out }) {
    yield* restoreState(state);
    yield* collectAll(state);
    yield* publish({ state, out });
  }),
);

/** @internal */
export const saveCommand = Command.make("save", { state: stateFlag }, ({ state }) =>
  saveState(state),
);
