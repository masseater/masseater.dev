import { Effect } from "effect";

import { commands } from "./generated/bindings.ts";

export const tauriWindow = {
  ready: (): Effect.Effect<unknown> => Effect.promise(() => commands.windowReady()),
  finishClosing: (quit: boolean): Effect.Effect<unknown> =>
    Effect.promise(() => commands.finishClosing(quit)),
};
