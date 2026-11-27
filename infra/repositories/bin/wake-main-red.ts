#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Boolean as Bool, Console, Effect } from "effect";

import { brokerIdToken, wakeProject } from "./lib/broker-client.ts";

const wakeOnRedMain = Effect.gen(function* wakeOnRedMain() {
  const oidc = yield* brokerIdToken;
  const woken = yield* wakeProject({ path: "wake/main-red", oidc });
  yield* Console.log(
    Bool.match(woken, {
      onTrue: () => "Asked the project to fix main",
      onFalse: () => "Asked recently: skipped",
    }),
  );
});

runMain("broker-wake-main-red")(wakeOnRedMain);
