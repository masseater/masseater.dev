#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, FileSystem, Path, String as Str, pipe } from "effect";
import { Argument, Command } from "effect/cli";

import { repositoryRoot } from "./manifest.ts";

const ASSETS = "release-assets";

const EXTENSIONS: Readonly<Record<string, string>> = {
  appimage: ".AppImage",
  deb: ".deb",
  dmg: ".dmg",
  msi: ".msi",
  nsis: ".exe",
  rpm: ".rpm",
};

const collectKind = Effect.fn("collect.kind")(function* collectKind(bundle: string, kind: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const extension = EXTENSIONS[kind];
  if (extension === undefined) {
    return yield* Effect.die(`${kind} is not a Tauri bundle kind that ships one file`);
  }
  const from = path.join(bundle, kind);
  const names = yield* fileSystem.readDirectory(from);
  const files = pipe(names, Arr.filter(Str.endsWith(extension)));
  if (!Arr.isReadonlyArrayNonEmpty(files)) {
    return yield* Effect.die(`${from} has no ${extension}`);
  }
  const to = path.join(ASSETS, kind);
  yield* fileSystem.makeDirectory(to, { recursive: true });
  yield* Effect.forEach(
    files,
    (name) => fileSystem.copyFile(path.join(from, name), path.join(to, name)),
    { discard: true },
  );
});

const command = Command.make(
  "bundle-collect",
  { kinds: Argument.String("kind").pipe(Argument.atLeast(1)) },
  ({ kinds }) =>
    Effect.gen(function* collect() {
      const path = yield* Path.Path;
      const root = yield* repositoryRoot;
      const bundle = path.join(root, "target", "release", "bundle");
      yield* Effect.forEach(kinds, (kind) => collectKind(bundle, kind), { discard: true });
    }),
);

runMain("bundle-collect")(Command.run(command, { version: "0.0.0" }));
