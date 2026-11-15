import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, FileSystem, Option, Path, String as Str } from "effect";

import { installers } from "./installers.ts";

const SIGNATURE = ".sig";

const firstWith = Effect.fn("collect.firstWith")(function* firstWith(
  directory: string,
  suffix: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(directory);
  const found = Arr.findFirst(names, Str.endsWith(suffix));
  if (Option.isNone(found)) {
    return yield* Effect.die(`${directory} has no ${suffix}`);
  }
  return path.join(directory, found.value);
});

const copy = Effect.fn("collect.copy")(function* copy(
  directory: string,
  suffix: string,
  to: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const from = yield* firstWith(directory, suffix);
  yield* fileSystem.copyFile(from, to);
  return from;
});

const copySigned = Effect.fn("collect.copySigned")(function* copySigned(
  directory: string,
  suffix: string,
  to: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const from = yield* copy(directory, suffix, to);
  yield* fileSystem.copyFile(`${from}${SIGNATURE}`, `${to}${SIGNATURE}`);
});

runMain("yohaku-collect")(
  Effect.gen(function* collect() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const { bundle, output, windows, mac, dmg } = yield* installers;
    yield* fileSystem.makeDirectory(output, { recursive: true });
    const nsis = path.join(bundle, "nsis");
    if (yield* fileSystem.exists(nsis)) {
      yield* copySigned(nsis, "-setup.exe", windows);
      return;
    }
    yield* copy(path.join(bundle, "dmg"), ".dmg", dmg);
    yield* copySigned(path.join(bundle, "macos"), ".app.tar.gz", mac);
  }),
);
