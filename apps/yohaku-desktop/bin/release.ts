import { gh, publishRelease, releaseExists, uploadAssets } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Config, DateTime, Effect, FileSystem, Option, Path, Schema } from "effect";

import { installers } from "./lib/installers.ts";

const TITLE = "余白";
const FEED = "yohaku-updater";
const FEED_TITLE = "余白: 更新の配信";
const LATEST = "latest.json";
const SIGNATURE = ".sig";

const Platform = Schema.Struct({ url: Schema.String, signature: Schema.String });

const LatestJson = Schema.fromJsonString(
  Schema.Struct({
    version: Schema.String,
    notes: Schema.String,
    pub_date: Schema.String,
    platforms: Schema.Struct({ "windows-x86_64": Platform, "darwin-aarch64": Platform }),
  }),
);

const signatureOf = Effect.fn("release.signatureOf")(function* signatureOf(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const built = yield* fileSystem.exists(file);
  if (!built) {
    return yield* Effect.die(`${file} is missing; the installers were built from another revision`);
  }
  return yield* fileSystem.readFileString(`${file}${SIGNATURE}`);
});

const ensureFeed = Effect.gen(function* ensureFeed() {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const sha = yield* Config.String("GITHUB_SHA");
  const exists = yield* releaseExists(FEED);
  if (!exists) {
    yield* gh([
      "release",
      "create",
      FEED,
      "--repo",
      repository,
      "--target",
      sha,
      "--latest=false",
      "--title",
      FEED_TITLE,
      "--notes",
      "",
    ]);
  }
});

const latestFor = Effect.fn("release.latestFor")(function* latestFor(tag: string) {
  const path = yield* Path.Path;
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const { version, windows, mac } = yield* installers;
  const windowsSignature = yield* signatureOf(windows);
  const macSignature = yield* signatureOf(mac);
  const download = `https://github.com/${repository}/releases/download/${tag}`;
  const now = yield* DateTime.now;
  return yield* Schema.encodeEffect(LatestJson)({
    version,
    notes: "",
    pub_date: DateTime.formatIso(now),
    platforms: {
      "windows-x86_64": {
        url: `${download}/${path.basename(windows)}`,
        signature: windowsSignature,
      },
      "darwin-aarch64": { url: `${download}/${path.basename(mac)}`, signature: macSignature },
    },
  });
});

const publishFeed = Effect.fn("release.publishFeed")(function* publishFeed(tag: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { output, windows, mac, dmg } = yield* installers;
  const latest = yield* latestFor(tag);
  yield* uploadAssets({ tag, files: [windows, dmg, mac] });
  const latestFile = path.join(output, LATEST);
  yield* fileSystem.writeFileString(latestFile, latest);
  yield* ensureFeed;
  yield* uploadAssets({ tag: FEED, files: [latestFile] });
});

runMain("yohaku-release")(
  Effect.gen(function* release() {
    const { target } = yield* installers;
    const tag = yield* publishRelease({ component: target, title: TITLE });
    if (Option.isSome(tag)) {
      yield* publishFeed(tag.value);
    }
  }),
);
