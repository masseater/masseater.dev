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

import { gh, output } from "#/shared/lib/command.ts";

const Manifest = Schema.fromJsonString(Schema.Record(Schema.String, Schema.String));

/** @internal */
export type Component = Readonly<{ name: string; root: string; workspace: string }>;

/** @internal */
export type Release = Readonly<{ name: string; version: string }>;

const manifestPath = (workspace: string): string => `${workspace}/.release-please-manifest.json`;

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

/** @internal */
export const repositoryRoot = output({ file: "git", args: ["rev-parse", "--show-toplevel"] });

/** @internal */
export const component = Effect.fn("manifest.component")(function* component(name: string) {
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  const workspace = pipe(path.relative(root, process.cwd()), Str.split(path.sep), Arr.join("/"));
  return { name, root, workspace };
});

/** @internal */
export const checkedOutVersion = Effect.fn("manifest.checkedOutVersion")(
  function* checkedOutVersion({ root, workspace }: Component) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const text = yield* fileSystem.readFileString(path.join(root, manifestPath(workspace)));
    return yield* versionIn(text, workspace);
  },
);

/** @internal */
export const mainVersion = Effect.fn("manifest.mainVersion")(function* mainVersion({
  workspace,
}: Component) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const text = yield* gh([
    "api",
    "-H",
    "Accept: application/vnd.github.raw",
    `repos/${repository}/contents/${manifestPath(workspace)}?ref=main`,
  ]);
  return yield* versionIn(text, workspace);
});

/** @internal */
export const tagOf = ({ name, version }: Release): string => `${name}-v${version}`;
