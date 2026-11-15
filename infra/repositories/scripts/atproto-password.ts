#!/usr/bin/env node
import { mask, setEnv } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Console, Effect, Option } from "effect";

import { brokerIdToken, issued } from "./broker-client.ts";

const NOT_YET =
  "::notice::No AT Protocol app password yet: POST it to https://credentials.masseater.dev/atproto/app-password";

const brokerAtprotoPassword = Effect.gen(function* brokerAtprotoPassword() {
  const oidc = yield* brokerIdToken;
  yield* mask(oidc);
  const password = yield* issued({ only: "atproto", field: "atpAppPassword", oidc });
  yield* Option.match(password, {
    onNone: () => Console.log(NOT_YET),
    onSome: (value) => mask(value).pipe(Effect.andThen(setEnv({ ATP_APP_PASSWORD: value }))),
  });
});

runMain("broker-atproto-password")(brokerAtprotoPassword);
