import {
  Array as Arr,
  Config,
  DateTime,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { gh, succeeds } from "#/shared/lib/command.ts";

import { feedOf, manifest } from "./manifest.ts";

const ASSETS = "release-assets";
const LATEST = "latest.json";
const SIGNATURE = ".sig";
const START = 0;

const TARGETS: readonly (readonly [suffix: string, platform: string])[] = [
  ["_x64-setup.exe", "windows-x86_64"],
  ["_aarch64.app.tar.gz", "darwin-aarch64"],
  ["_amd64.AppImage", "linux-x86_64"],
];

const Platform = Schema.Struct({ url: Schema.String, signature: Schema.String });

const LatestJson = Schema.fromJsonString(
  Schema.Struct({
    version: Schema.String,
    notes: Schema.String,
    pub_date: Schema.String,
    platforms: Schema.Record(Schema.String, Platform),
  }),
);

/** @internal */
export const platformOf = (file: string): Option.Option<string> =>
  pipe(
    TARGETS,
    Arr.findFirst(([suffix]) => Str.endsWith(suffix)(file)),
    Option.map(([, platform]) => platform),
  );

const signed = Effect.gen(function* signed() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fileSystem.readDirectory(ASSETS, { recursive: true });
  const signatures = pipe(files, Arr.filter(Str.endsWith(SIGNATURE)));
  return pipe(
    signatures,
    Arr.map((signature) => path.join(ASSETS, Str.slice(START, -SIGNATURE.length)(signature))),
  );
});

const entryOf = Effect.fn("updaterFeed.entryOf")(function* entryOf(file: string, download: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const signature = yield* fileSystem.readFileString(`${file}${SIGNATURE}`);
  return Option.map(
    platformOf(file),
    (platform) => [platform, { url: `${download}/${path.basename(file)}`, signature }] as const,
  );
});

const latestFor = Effect.fn("updaterFeed.latestFor")(function* latestFor(
  tag: string,
  version: string,
) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const download = `https://github.com/${repository}/releases/download/${tag}`;
  const files = yield* signed;
  const entries = yield* Effect.forEach(files, (file) => entryOf(file, download), {
    concurrency: 1,
  });
  const platforms = Rec.fromEntries(Arr.getSomes(entries));
  if (Rec.isEmptyRecord(platforms)) {
    return yield* Effect.die(`${ASSETS} has no signed installer`);
  }
  const now = yield* DateTime.now;
  return yield* Schema.encodeEffect(LatestJson)({
    version,
    notes: "",
    pub_date: DateTime.formatIso(now),
    platforms,
  });
});

const ensureFeed = Effect.fn("updaterFeed.ensureFeed")(function* ensureFeed(
  feed: string,
  title: string,
) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const sha = yield* Config.String("GITHUB_SHA");
  const view = ["release", "view", feed, "--repo", repository];
  if (yield* succeeds({ file: "gh", args: view })) {
    return;
  }
  yield* gh([
    "release",
    "create",
    feed,
    "--repo",
    repository,
    "--target",
    sha,
    "--latest=false",
    "--title",
    title,
    "--notes",
    "",
  ]);
});

const writeLatest = Effect.fn("updaterFeed.writeLatest")(function* writeLatest(
  tag: string,
  version: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const latest = yield* latestFor(tag, version);
  const file = path.join(ASSETS, LATEST);
  yield* fileSystem.writeFileString(file, latest);
  return file;
});

/** @internal */
export const updaterFeed = Effect.gen(function* updaterFeed() {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const tag = yield* Config.String("RELEASE_TAG");
  const { name, version } = yield* manifest;
  const file = yield* writeLatest(tag, version);
  const feed = feedOf(name);
  yield* ensureFeed(feed, `${name} updates`);
  yield* gh(["release", "upload", feed, file, "--repo", repository, "--clobber"]);
});
