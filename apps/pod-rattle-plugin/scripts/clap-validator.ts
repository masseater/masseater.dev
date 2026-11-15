import { repositoryRoot, run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Effect, Path } from "effect";

import { CLAP, bundlesWith } from "./bundled.ts";

runMain("pod-rattle-clap-validator")(
  Effect.gen(function* clapValidator() {
    const path = yield* Path.Path;
    const root = yield* repositoryRoot;
    const validator = path.join(
      root,
      "tools",
      "cargo-tools",
      "target",
      "release",
      "clap-validator",
    );
    const bundles = yield* bundlesWith(CLAP);
    yield* Effect.forEach(
      bundles,
      (bundle) => run({ file: validator, args: ["validate", bundle] }),
      { discard: true },
    );
  }),
);
