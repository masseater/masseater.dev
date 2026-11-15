import { runMain } from "@masseater.dev/node-main";
import { Effect } from "effect";

import { VST3, bundlesWith, cargo } from "./bundled.ts";

const render = (bundle: string): ReturnType<typeof cargo> =>
  cargo(["--package", "pod-rattle-host", "--release", "--", bundle, "release-reports/host"]);

runMain("pod-rattle-host")(
  Effect.gen(function* host() {
    const bundles = yield* bundlesWith(VST3);
    yield* Effect.forEach(bundles, render, { discard: true });
  }),
);
