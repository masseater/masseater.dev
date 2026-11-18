#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Boolean as Bool, Effect } from "effect";

import { launchWithTsrs } from "#/features/launch-with-tsrs/index.ts";

const NODE_AND_SCRIPT = 2;
const FAILED = 1;

const failUnless = (passed: boolean): Effect.Effect<void> =>
  Bool.match(passed, {
    onFalse: () =>
      Effect.sync(() => {
        process.exitCode = FAILED;
      }),
    onTrue: () => Effect.void,
  });

runMain("tsrs-effect")(
  launchWithTsrs({
    host: {
      directory: `${import.meta.dirname}/..`,
      platform: process.platform,
      arch: process.arch,
    },
    argv: process.argv.slice(NODE_AND_SCRIPT),
  }).pipe(Effect.flatMap(failUnless)),
);
