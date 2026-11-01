import { Effect } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { openPanel } from "./panel.ts";

Effect.runFork(
  Effect.promise(() =>
    Promise.resolve(GM.registerMenuCommand("このページを scrap にする", openPanel)),
  ),
);
