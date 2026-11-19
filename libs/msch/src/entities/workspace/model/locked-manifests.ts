import {
  Array as Arr,
  Boolean as Bool,
  Effect,
  Function as Fn,
  Option,
  Record as Rec,
  Schema,
  pipe,
} from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import type { LockedClosure } from "./locked-closures.ts";

const MANIFEST = "package.json";
const VERSION = "version";
const MISSING = "missing";
const MANIFEST_PREFIX = "manifest:";
const FILE_CONCURRENCY = 16;
const SEPARATOR = " ";

const ManifestJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const decodeManifest = Schema.decodeUnknownOption(ManifestJson);
const encodeManifest = Schema.encodeOption(ManifestJson);

const withoutVersion = (text: string): string =>
  pipe(
    decodeManifest(text),
    Option.map(Rec.remove(VERSION)),
    Option.flatMap(encodeManifest),
    Option.getOrElse(() => text),
  );

const manifestHash =
  (root: string, normalize: (text: string) => string) =>
  (workspace: string): Effect.Effect<string, never, RepositoryFiles> =>
    Effect.gen(function* readManifestHash() {
      const files = yield* RepositoryFiles;
      const text = yield* files.readFile(files.join(root, workspace, MANIFEST));
      if (Option.isNone(text)) {
        return MISSING;
      }
      return yield* files.hash(normalize(text.value));
    });

const normalizerFor =
  (importer: string) =>
  (workspace: string): ((text: string) => string) =>
    Bool.match(workspace === importer, {
      onTrue: () => Fn.identity,
      onFalse: () => withoutVersion,
    });

/** @internal */
export const manifestLines = Effect.fn("manifestLines")(function* manifestLines(
  root: string,
  importer: string,
  { workspaces }: LockedClosure,
) {
  const hashes = yield* Effect.forEach(
    workspaces,
    (workspace) => manifestHash(root, normalizerFor(importer)(workspace))(workspace),
    { concurrency: FILE_CONCURRENCY },
  );
  return Arr.zipWith(
    workspaces,
    hashes,
    (workspace, hash) => `${MANIFEST_PREFIX}${workspace}${SEPARATOR}${hash}`,
  );
});

/** @internal */
export const manifestsFingerprint = Effect.fn("manifestsFingerprint")(
  function* manifestsFingerprint(root: string, importers: readonly string[]) {
    const files = yield* RepositoryFiles;
    const hashes = yield* Effect.forEach(importers, manifestHash(root, Fn.identity), {
      concurrency: FILE_CONCURRENCY,
    });
    return yield* files.hash(Arr.join(hashes, SEPARATOR));
  },
);
