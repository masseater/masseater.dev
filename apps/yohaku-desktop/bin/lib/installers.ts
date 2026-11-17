import { repositoryRoot } from "@masseater.dev/component-release";
import { Effect, FileSystem, Path, Schema } from "effect";

const OUTPUT = "release-assets";

const Manifest = Schema.fromJsonString(Schema.Struct({ version: Schema.String }));

/** @internal */
export const installers = Effect.gen(function* installers() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  const { version } = yield* fileSystem
    .readFileString("package.json")
    .pipe(Effect.flatMap(Schema.decodeEffect(Manifest)));
  const output = path.resolve(OUTPUT);
  return {
    version,
    output,
    bundle: path.join(root, "target", "release", "bundle"),
    windows: path.join(output, `yohaku_${version}_x64-setup.exe`),
    mac: path.join(output, `yohaku_${version}_aarch64.app.tar.gz`),
    dmg: path.join(output, `yohaku_${version}_aarch64.dmg`),
  };
});
