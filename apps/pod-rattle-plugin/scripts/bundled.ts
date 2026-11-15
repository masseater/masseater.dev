import { repositoryRoot, run } from "@masseater.dev/component-release";
import { Array as Arr, Effect, FileSystem, Order, Path, String as Str, pipe } from "effect";

const VST3 = ".vst3";
const CLAP = ".clap";

const bundledDirectory = Effect.gen(function* bundledDirectory() {
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  return path.join(root, "target", "bundled");
});

const bundlesWith = Effect.fn("bundled.bundlesWith")(function* bundlesWith(extension: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* bundledDirectory;
  const names = yield* fileSystem.readDirectory(directory);
  const matching = pipe(names, Arr.filter(Str.endsWith(extension)));
  const bundles = Arr.sort(matching, Order.String);
  return pipe(
    bundles,
    Arr.map((name) => path.join(directory, name)),
  );
});

const cargo = (args: readonly string[]): ReturnType<typeof run> =>
  run({ file: "cargo", args: ["run", ...args] });

/** @internal */
export { CLAP, VST3, bundledDirectory, bundlesWith, cargo };
