import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Schema,
  pipe,
} from "effect";

import { gh, succeeds } from "./command.ts";
import { checkedOutVersion, mainVersion, tagOf } from "./manifest.ts";
import type { Component } from "./manifest.ts";

const NO_ASSETS = 0;
const PENDING = "autorelease: pending";
const TAGGED = "autorelease: tagged";

const AssetCount = Schema.fromJsonString(Schema.Finite);
const PullNumbers = Schema.fromJsonString(Schema.Array(Schema.Finite));

/** @internal */
export type Publish = Readonly<{ component: Component; title: string }>;

/** @internal */
export type Upload = Readonly<{ tag: string; files: readonly string[] }>;

/** @internal */
export const releaseExists = Effect.fn("release.exists")(function* releaseExists(tag: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  return yield* succeeds({ file: "gh", args: ["release", "view", tag, "--repo", repository] });
});

const checkedOutTag = Effect.fn("release.checkedOutTag")(function* checkedOutTag(
  component: Component,
) {
  const version = yield* checkedOutVersion(component);
  return { version, tag: tagOf({ name: component.name, version }) };
});

/** @internal */
export const tagComponent = Effect.fn("release.tag")(function* tagComponent(component: Component) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const sha = yield* Config.String("GITHUB_SHA");
  const { tag } = yield* checkedOutTag(component);
  const ref = `repos/${repository}/git/ref/tags/${tag}`;
  const exists = yield* succeeds({ file: "gh", args: ["api", ref] });
  if (!exists) {
    const created = ["-f", `ref=refs/tags/${tag}`, "-f", `sha=${sha}`];
    yield* gh(["api", "-X", "POST", `repos/${repository}/git/refs`, ...created]);
  }
  return tag;
});

const markTagged = Effect.fn("release.markTagged")(function* markTagged(name: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const head = `release-please--branches--main--components--${name}`;
  const listed = yield* gh([
    "pr",
    "list",
    "--repo",
    repository,
    "--state",
    "merged",
    "--label",
    PENDING,
    "--head",
    head,
    "--json",
    "number",
    "--jq",
    "[.[].number]",
  ]);
  const pulls = yield* Schema.decodeEffect(PullNumbers)(listed);
  const relabel = (pull: number): ReturnType<typeof gh> =>
    gh([
      "pr",
      "edit",
      String(pull),
      "--repo",
      repository,
      "--remove-label",
      PENDING,
      "--add-label",
      TAGGED,
    ]);
  yield* Effect.all(pipe(pulls, Arr.map(relabel)));
});

const createRelease = Effect.fn("release.create")(function* createRelease({
  component,
  title,
}: Publish) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const { tag, version } = yield* checkedOutTag(component);
  const exists = yield* releaseExists(tag);
  if (!exists) {
    yield* gh([
      "release",
      "create",
      tag,
      "--repo",
      repository,
      "--verify-tag",
      "--latest=false",
      "--title",
      `${title}: v${version}`,
      "--notes",
      "",
    ]);
  }
  return tag;
});

const hasAssets = Effect.fn("release.hasAssets")(function* hasAssets(tag: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const listed = yield* gh([
    "release",
    "view",
    tag,
    "--repo",
    repository,
    "--json",
    "assets",
    "--jq",
    ".assets | length",
  ]);
  const count = yield* Schema.decodeEffect(AssetCount)(listed);
  return count !== NO_ASSETS;
});

/** @internal */
export const publishRelease = Effect.fn("release.publish")(function* publishRelease(
  publish: Publish,
) {
  const tag = yield* createRelease(publish);
  yield* markTagged(publish.component.name);
  const published = yield* hasAssets(tag);
  if (published) {
    yield* Effect.logInfo(`${tag} is already published`);
    return Option.none<string>();
  }
  return Option.some(tag);
});

/** @internal */
export const uploadAssets = Effect.fn("release.upload")(function* uploadAssets({
  tag,
  files,
}: Upload) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  yield* gh(["release", "upload", tag, ...files, "--repo", repository, "--clobber"]);
});

/** @internal */
export const filesIn = Effect.fn("release.filesIn")(function* filesIn(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(directory, { recursive: true });
  const isFile = (file: string): Effect.Effect<boolean> =>
    fileSystem.stat(file).pipe(
      Effect.map(({ type }) => type === "File"),
      Effect.orElseSucceed(() => false),
    );
  const files = yield* Effect.filter(
    pipe(
      names,
      Arr.map((name) => path.join(directory, name)),
    ),
    isFile,
  );
  return Arr.sort(files, Order.String);
});

/** @internal */
export const releasedOnMain = Effect.fn("release.releasedOnMain")(function* releasedOnMain(
  component: Component,
) {
  const version = yield* mainVersion(component);
  const tag = tagOf({ name: component.name, version });
  const released = yield* releaseExists(tag);
  if (!released) {
    yield* Effect.logInfo(
      `${tag} is not released yet; the run for its release commit runs release-please`,
    );
  }
  return released;
});
