import { run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect } from "effect";

import { CLAP, VST3, bundlesWith } from "./bundled.ts";

const sign = (bundle: string): ReturnType<typeof run> =>
  run({ file: "codesign", args: ["--force", "--deep", "--sign", "-", bundle] });

runMain("pod-rattle-codesign")(
  Effect.gen(function* codesign() {
    const vst3 = yield* bundlesWith(VST3);
    const clap = yield* bundlesWith(CLAP);
    yield* Effect.forEach(Arr.appendAll(vst3, clap), sign, { discard: true });
  }),
);
