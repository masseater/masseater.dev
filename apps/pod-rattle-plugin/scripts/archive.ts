import { run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Path, String as Str, pipe } from "effect";
import { Argument, Command } from "effect/cli";

import { CLAP, VST3, bundlesWith } from "./bundled.ts";

const OUTPUT = "release-assets";

const slugOf = (name: string): string => pipe(name, Str.toLowerCase, Str.replaceAll(" ", "-"));

const command = Command.make(
  "pod-rattle-archive",
  { platform: Argument.String("platform") },
  ({ platform }) =>
    Effect.gen(function* archive() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
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

runMain("pod-rattle-archive")(Command.run(command, { version: "0.0.0" }));
