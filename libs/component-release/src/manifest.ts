import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  Record,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { gh, output } from "./command.ts";

const Manifest = Schema.fromJsonString(Schema.Record(Schema.String, Schema.String));

type Component = Readonly<{ name: string; root: string; workspace: string }>;

type Release = Readonly<{ name: string; version: string }>;

const manifestPath = (name: string): string => `.github/release-please/${name}-manifest.json`;

const versionIn = Effect.fn("manifest.versionIn")(function* versionIn(
  text: string,
  workspace: string,
) {
  const manifest = yield* Schema.decodeEffect(Manifest)(text);
  const version = Record.get(manifest, workspace);
  if (Option.isNone(version)) {
    return yield* Effect.die(`${workspace} has no version in the release-please manifest`);
  }
  return version.value;
});

const repositoryRoot = output({ file: "git", args: ["rev-parse", "--show-toplevel"] });

const component = Effect.fn("manifest.component")(function* component(name: string) {
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  const workspace = pipe(path.relative(root, process.cwd()), Str.split(path.sep), Arr.join("/"));
  return { name, root, workspace };
});

const checkedOutVersion = Effect.fn("manifest.checkedOutVersion")(function* checkedOutVersion({
  name,
  root,
  workspace,
}: Component) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(root, manifestPath(name)));
  return yield* versionIn(text, workspace);
});

const mainVersion = Effect.fn("manifest.mainVersion")(function* mainVersion({
  name,
  workspace,
}: Component) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const text = yield* gh([
    "api",
    "-H",
    "Accept: application/vnd.github.raw",
    `repos/${repository}/contents/${manifestPath(name)}?ref=main`,
  ]);
  return yield* versionIn(text, workspace);
});

const tagOf = ({ name, version }: Release): string => `${name}-v${version}`;

/** @internal */
export { checkedOutVersion, component, mainVersion, repositoryRoot, tagOf };
/** @internal */
export type { Component, Release };
