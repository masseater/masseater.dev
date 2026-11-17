import { mustSucceed, outputOf, succeeds } from "@masseater.dev/github-workflow";
import { Array as Arr, Config, Effect, Option, Schema, pipe } from "effect";
import semver from "semver";

import { brokerCredential } from "./broker.ts";
import { goesToNpm, tagOf } from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { provenanceCommit } from "./provenance.ts";

const UNVERSIONED = "0.0.0";
const LOOKUP_CONCURRENCY = 4;

const Versions = Schema.fromJsonString(Schema.Array(Schema.String));

/** @internal */
export interface Workspace {
  readonly directory: string;
  readonly manifest: Manifest;
}

/** @internal */
export interface Revision {
  readonly tag: string;
  readonly sha: string;
}

/** @internal */
export const tagged = Effect.fn("publish.tagged")(function* tagged(tag: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  return yield* succeeds({
    command: "gh",
    args: ["api", `repos/${repository}/git/ref/tags/${tag}`],
  });
});

const tokenEnv = brokerCredential({ kind: "github", field: "githubToken" }).pipe(
  Effect.map(
    Option.match({
      onNone: (): Readonly<Record<string, string>> => ({}),
      onSome: (value): Readonly<Record<string, string>> => ({ GH_TOKEN: value }),
    }),
  ),
);

/** @internal */
export const createTag = Effect.fn("publish.createTag")(function* createTag({
  tag,
  sha,
}: Revision) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
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

const isRelease = (version: string): boolean =>
  version !== UNVERSIONED && semver.valid(version) !== null && semver.prerelease(version) === null;

const publishedVersions = Effect.fn("publish.publishedVersions")(function* publishedVersions({
  directory,
  manifest,
}: Workspace) {
  if (!goesToNpm(manifest)) {
    return [];
  }
  const text = yield* outputOf({
    command: "npm",
    args: ["view", manifest.name, "versions", "--json"],
    cwd: directory,
  }).pipe(Effect.orElseSucceed(() => "[]"));
  const versions = yield* Schema.decodeEffect(Versions)(text).pipe(
    Effect.orElseSucceed((): readonly string[] => []),
  );
  return pipe(
    versions,
    Arr.filter((version) => isRelease(version) && version !== manifest.version),
  );
});

/** @internal */
export const untaggedVersions = Effect.fn("publish.untaggedVersions")(function* untaggedVersions(
  workspace: Workspace,
) {
  const versions = yield* publishedVersions(workspace);
  return yield* Effect.filter(
    versions,
    (version) =>
      tagged(
        tagOf({ directory: workspace.directory, name: workspace.manifest.name, version }),
      ).pipe(Effect.map((found) => !found)),
    { concurrency: LOOKUP_CONCURRENCY },
  );
});

const backfillVersion = Effect.fn("publish.backfillVersion")(function* backfillVersion(
  workspace: Workspace,
  version: string,
) {
  const { directory, manifest } = workspace;
  const tag = tagOf({ directory, name: manifest.name, version });
  const commit = yield* provenanceCommit({ name: manifest.name, version });
  if (Option.isNone(commit)) {
    yield* Effect.logWarning(`${tag} has no npm provenance, so it stays untagged`);
    return;
  }
  yield* createTag({ tag, sha: commit.value });
});

/** @internal */
export const backfillTags = Effect.fn("publish.backfillTags")(function* backfillTags(
  workspace: Workspace,
) {
  const versions = yield* untaggedVersions(workspace);
  yield* Effect.forEach(versions, (version) => backfillVersion(workspace, version), {
    concurrency: 1,
    discard: true,
  });
});
