import { Effect } from "effect";

import { commands } from "./generated/bindings.ts";

const tauriWindow = {
  ready: (): Effect.Effect<unknown> => Effect.promise(() => commands.windowReady()),
  finishClosing: (quit: boolean): Effect.Effect<unknown> =>
    Effect.promise(() => commands.finishClosing(quit)),
};

export { tauriWindow };
