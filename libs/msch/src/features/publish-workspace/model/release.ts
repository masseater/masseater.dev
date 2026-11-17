import { mustSucceed, succeeds, writeOutputs } from "@masseater.dev/github-workflow";
import { Array as Arr, Config, Effect, FileSystem, Order, Path, pipe } from "effect";

import { isVersioned, manifestIn, releaseName, tagOf } from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { releasedWithAssets } from "./plan.ts";

const ASSETS = "release-assets";

const tagRevision = Effect.fn("publish.tag")(function* tagRevision(tag: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const sha = yield* Config.String("GITHUB_SHA");
  const exists = yield* succeeds({
    command: "gh",
    args: ["api", `repos/${repository}/git/ref/tags/${tag}`],
  });
  if (exists) {
    return;
  }
  yield* mustSucceed({
    command: "gh",
    args: [
      "api",
      "-X",
      "POST",
      `repos/${repository}/git/refs`,
      "-f",
      `ref=refs/tags/${tag}`,
      "-f",
      `sha=${sha}`,
    ],
  });
});

const assetsIn = Effect.fn("publish.assets")(function* assetsIn(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = path.join(directory, ASSETS);
  if (!(yield* fileSystem.exists(folder))) {
    return [];
  }
  const names = yield* fileSystem.readDirectory(folder, { recursive: true });
  const files = yield* Effect.filter(
    pipe(
      names,
      Arr.map((name) => path.join(folder, name)),
    ),
    (file) =>
      fileSystem.stat(file).pipe(
        Effect.map(({ type }) => type === "File"),
        Effect.orElseSucceed(() => false),
      ),
  );
  return Arr.sort(files, Order.String);
});

const createRelease = Effect.fn("publish.createRelease")(function* createRelease(
  tag: string,
  title: string,
) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const exists = yield* succeeds({
    command: "gh",
    args: ["release", "view", tag, "--repo", repository],
  });
  if (exists) {
    return;
  }
  yield* mustSucceed({
    command: "gh",
    args: [
      "release",
      "create",
      tag,
      "--repo",
      repository,
      "--verify-tag",
      "--latest=false",
      "--title",
      title,
      "--notes",
      "",
    ],
  });
});

const uploadAssets = Effect.fn("publish.uploadAssets")(function* uploadAssets(
  directory: string,
  manifest: Manifest,
) {
  const tag = tagOf(manifest);
  const files = yield* assetsIn(directory);
  if (Arr.isReadonlyArrayEmpty(files) || (yield* releasedWithAssets(tag))) {
    return;
  }
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  yield* createRelease(tag, `${releaseName(manifest)} v${manifest.version}`);
  yield* mustSucceed({
    command: "gh",
    args: ["release", "upload", tag, ...files, "--repo", repository, "--clobber"],
  });
});

/** @internal */
export const publishRelease = Effect.fn("publish.release")(function* publishRelease(
  directory: string,
) {
  const manifest = yield* manifestIn(directory);
  if (!isVersioned(manifest)) {
    yield* Effect.logInfo(`${manifest.name} has no version to publish`);
    return;
  }
  const tag = tagOf(manifest);
  yield* tagRevision(tag);
  yield* writeOutputs({ tag });
  yield* uploadAssets(directory, manifest);
});
