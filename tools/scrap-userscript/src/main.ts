import { Effect } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { openPanel } from "./panel.ts";
import { loadSettings } from "./storage.ts";

Effect.runFork(
  Effect.promise(() =>
    Promise.resolve(
      GM.registerMenuCommand("このページを scrap にする", () => {
        Effect.runFork(loadSettings.pipe(Effect.map(openPanel)));
      }),
    ),
  ),
);
