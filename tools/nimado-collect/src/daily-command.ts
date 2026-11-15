import { Effect } from "effect";
import { Command, Flag } from "effect/cli";

import { collectAll, stateFlag } from "./commands.ts";
import { publish } from "./publish-command.ts";
import { restoreState, saveState } from "./release-state.ts";

/** @internal */
const dailyCommand = Command.make(
  "daily",
  { state: stateFlag, out: Flag.String("out") },
  Effect.fn("command.daily")(function* daily({ state, out }) {
    yield* restoreState(state);
    yield* collectAll(state);
    yield* publish({ state, out });
  }),
);

/** @internal */
const saveCommand = Command.make("save", { state: stateFlag }, ({ state }) => saveState(state));

export { dailyCommand, saveCommand };
