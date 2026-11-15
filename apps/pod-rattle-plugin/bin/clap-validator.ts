import { run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Effect } from "effect";

import { CLAP, bundlesWith } from "./lib/bundled.ts";

const VERSION = "0.4.1";
const REPOSITORY = "https://github.com/free-audio/clap-validator";

const validate = (bundle: string): ReturnType<typeof run> =>
  run({ file: "clap-validator", args: ["validate", bundle] });

runMain("pod-rattle-clap-validator")(
  Effect.gen(function* clapValidator() {
    yield* run({
      file: "cargo",
      args: ["install", "--locked", "--git", REPOSITORY, "--tag", VERSION, "clap-validator"],
    });
    const bundles = yield* bundlesWith(CLAP);
    yield* Effect.forEach(bundles, validate, { discard: true });
  }),
);
