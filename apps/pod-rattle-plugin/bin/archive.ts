import { run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Config, Effect, FileSystem, Path, String as Str, pipe } from "effect";

import { CLAP, VST3, bundlesWith } from "./lib/bundled.ts";

const OUTPUT = "plugins";

const slugOf = (name: string): string => pipe(name, Str.toLowerCase, Str.replaceAll(" ", "-"));

runMain("pod-rattle-archive")(
  Effect.gen(function* archive() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const platform = yield* Config.String("PLATFORM");
    const output = path.resolve(OUTPUT);
    yield* fileSystem.makeDirectory(output, { recursive: true });
    const bundles = yield* bundlesWith(VST3);
    yield* Effect.forEach(
      bundles,
      (vst3) => {
        const name = path.basename(vst3, VST3);
        const zip = path.join(output, `${slugOf(name)}-${platform}.zip`);
        const cwd = path.dirname(vst3);
        const pair = [`${name}${VST3}`, `${name}${CLAP}`];
        return run({ file: "7z", args: ["a", "-tzip", zip, ...pair], cwd });
      },
      { discard: true },
    );
  }),
);
