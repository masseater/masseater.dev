import { Array as Arr, Effect, FileSystem, Option, Order, Path, Schema, pipe } from "effect";

import { TauriConfigJson, devServerOf } from "#/features/unleash-gremlins/model/tauri-config.ts";
import type { DesktopApp } from "#/features/unleash-gremlins/model/tauri-config.ts";

const CONFIG = "src-tauri/tauri.conf.json";
const REPOSITORY_ROOT = "../..";

const decodeConfig = Schema.decodeEffect(TauriConfigJson);

const appOf = Effect.fn("monkey.desktop.app")(function* appOf(name: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = path.resolve(REPOSITORY_ROOT, "apps", name);
  const config = yield* fs
    .readFileString(path.join(dir, CONFIG))
    .pipe(Effect.flatMap(decodeConfig), Effect.option);
  return pipe(
    config,
    Option.flatMap(devServerOf),
    Option.map(({ command, url }): DesktopApp => ({ name, dir, command, url })),
  );
});

const found = Effect.fn("monkey.desktop.find")(function* found() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fs
    .readDirectory(path.resolve(REPOSITORY_ROOT, "apps"))
    .pipe(Effect.orElseSucceed((): readonly string[] => []));
  const apps = yield* Effect.forEach(names, appOf, { concurrency: 1 });
  return pipe(
    apps,
    Arr.flatMap((app) => Option.toArray(app)),
    Arr.sortWith((app) => app.name, Order.String),
  );
});

/** @internal */
export const findDesktopApps = found;
