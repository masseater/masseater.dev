import { mustSucceed, succeeds, writeOutputs } from "@masseater.dev/github-workflow";
import { Array as Arr, Config, Effect, FileSystem, Option, Order, Path, pipe } from "effect";

import { brokerCredential } from "./broker.ts";
import { goesToNpm, isRoot, isVersioned, manifestIn, releaseName, tagOf } from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { releasedWithAssets, tagged } from "./plan.ts";
import { provenanceCommit } from "./provenance.ts";

const ASSETS = "release-assets";

const revisionOf = Effect.fn("publish.revision")(function* revisionOf(manifest: Manifest) {
  const head = yield* Config.String("GITHUB_SHA");
  if (!goesToNpm(manifest)) {
    return head;
  }
  const published = yield* provenanceCommit(manifest);
  return Option.getOrElse(published, () => head);
});

const tokenEnv = brokerCredential({ kind: "github", field: "githubToken" }).pipe(
  Effect.map(
    Option.match({
      onNone: (): Readonly<Record<string, string>> => ({}),
      onSome: (value): Readonly<Record<string, string>> => ({ GH_TOKEN: value }),
    }),
  ),
);

const tagRevision = Effect.fn("publish.tag")(function* tagRevision(
  tag: string,
  manifest: Manifest,
) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  if (yield* tagged(tag)) {
    return;
  }
  const sha = yield* revisionOf(manifest);
  const env = yield* tokenEnv;
  yield* Effect.logInfo(`tagging ${tag} at ${sha}`);
  yield* mustSucceed({
    command: "gh",
    env,
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

const LIBRARY_NOTES = ["--latest=false", "--notes", ""];
const ROOT_NOTES = ["--latest", "--generate-notes"];

const notesOf = (directory: string): readonly string[] => {
  if (isRoot(directory)) {
    return ROOT_NOTES;
  }
  return LIBRARY_NOTES;
};

interface Release {
  readonly directory: string;
  readonly manifest: Manifest;
}

const createRelease = Effect.fn("publish.createRelease")(function* createRelease({
  directory,
  manifest,
}: Release) {
  const tag = tagOf({ directory, ...manifest });
  const notes = notesOf(directory);
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
      "--title",
      `${releaseName(manifest)} v${manifest.version}`,
      ...notes,
    ],
  });
});

const uploadAssets = Effect.fn("publish.uploadAssets")(function* uploadAssets({
  directory,
  manifest,
}: Release) {
  const tag = tagOf({ directory, ...manifest });
  const files = yield* assetsIn(directory);
  if (Arr.isReadonlyArrayEmpty(files) || (yield* releasedWithAssets(tag))) {
    return;
  }
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  yield* createRelease({ directory, manifest });
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
  const tag = tagOf({ directory, ...manifest });
  yield* tagRevision(tag, manifest);
  yield* writeOutputs({ tag });
  if (isRoot(directory)) {
    yield* createRelease({ directory, manifest });
  }
  yield* uploadAssets({ directory, manifest });
});
