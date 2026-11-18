#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { Argument, Command } from "effect/cli";

import { repositoryRoot } from "#/shared/lib/command.ts";

const ASSETS = "release-assets";
const AT_LEAST_ONE = 1;

const SEPARATOR = "_";

const Manifest = Schema.Struct({ name: Schema.String });

const EXTENSIONS: Readonly<Record<string, string>> = {
  appimage: ".AppImage",
  deb: ".deb",
  dmg: ".dmg",
  msi: ".msi",
  nsis: ".exe",
  rpm: ".rpm",
};

const extensionOf = (kind: string): Effect.Effect<string> =>
  pipe(
    Rec.get(EXTENSIONS, kind),
    Option.match({
      onNone: () => Effect.die(`${kind} is not a Tauri bundle kind that ships one file`),
      onSome: Effect.succeed,
    }),
  );

const bundled = Effect.fn("collect.bundled")(function* bundled(from: string, extension: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const names = yield* fileSystem.readDirectory(from);
  const files = pipe(names, Arr.filter(Str.endsWith(extension)));
  if (!Arr.isReadonlyArrayNonEmpty(files)) {
    return yield* Effect.die(`${from} has no ${extension}`);
  }
  return files;
});

const packageName = Effect.fn("collect.package")(function* packageName() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  const manifest = yield* Schema.decodeEffect(Schema.fromJsonString(Manifest))(text);
  return manifest.name;
});

const assetName = (name: string, file: string): string =>
  pipe(
    Str.indexOf(SEPARATOR)(file),
    Option.match({
      onNone: () => file,
      onSome: (index) => `${name}${Str.slice(index)(file)}`,
    }),
  );

const collectKind = Effect.fn("collect.kind")(function* collectKind(
  bundle: string,
  kind: string,
  name: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const extension = yield* extensionOf(kind);
  const from = path.join(bundle, kind);
  const files = yield* bundled(from, extension);
  const to = path.join(ASSETS, kind);
  yield* fileSystem.makeDirectory(to, { recursive: true });
  yield* Effect.forEach(
    files,
    (file) => fileSystem.copyFile(path.join(from, file), path.join(to, assetName(name, file))),
    { concurrency: 1, discard: true },
  );
});

const command = Command.make(
  "bundle-collect",
  { kinds: Argument.String("kind").pipe(Argument.atLeast(AT_LEAST_ONE)) },
  ({ kinds }) =>
    Effect.gen(function* collect() {
      const path = yield* Path.Path;
      const root = yield* repositoryRoot;
      const bundle = path.join(root, "target", "release", "bundle");
      const name = yield* packageName();
      yield* Effect.forEach(kinds, (kind) => collectKind(bundle, kind, name), {
        concurrency: 1,
        discard: true,
      });
    }),
);

runMain("bundle-collect")(Command.run(command, { version: "0.0.0" }));
