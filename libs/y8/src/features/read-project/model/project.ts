import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import type { PackageManifest, Project } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import { native } from "#/shared/native/index.ts";

const MANIFEST = "package.json";
const SEPARATOR = "/";
const ONE = 1;

const ancestorsOf = (file: string): readonly string[] => {
  const parts = Str.split(file, SEPARATOR);
  return Arr.makeBy(parts.length, (index) =>
    pipe(parts, Arr.take(parts.length - ONE - index), Arr.join(SEPARATOR)),
  );
};

const manifestFileOf = (directory: string): string =>
  pipe([directory, MANIFEST], Arr.filter(Str.isNonEmpty), Arr.join(SEPARATOR));

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const manifestFrom =
  (directory: string) =>
  (text: string | null): Option.Option<PackageManifest> =>
    pipe(
      Option.fromNullishOr(text),
      Option.flatMap(decodeJson),
      Option.filter(Predicate.isObject),
      Option.map((data): PackageManifest => ({ directory, data })),
    );

export interface ProjectInput {
  readonly root: string;
  readonly projectFiles: readonly string[];
  readonly files: readonly string[];
}

const prefixOf = (directory: string): string =>
  pipe(
    Option.liftPredicate(directory, Str.isNonEmpty),
    Option.map((value) => `${value}${SEPARATOR}`),
    Option.getOrElse(() => ""),
  );

const isUnder = (directory: string): ((path: string) => boolean) =>
  Str.startsWith(prefixOf(directory));

export const readProject = Effect.fn("y8.project")(function* readProject(input: ProjectInput) {
  const listed: ReadonlySet<string> = new Set([...input.projectFiles, ...input.files]);
  const all = Arr.fromIterable(listed);
  const directories = pipe(
    input.files,
    Arr.flatMap(ancestorsOf),
    Arr.dedupe,
    Arr.filter((directory) => listed.has(manifestFileOf(directory))),
  );
  const addon = yield* native;
  const texts = yield* Effect.try({
    try: () => addon.readTexts(input.root, pipe(directories, Arr.map(manifestFileOf))),
    catch: failedWith("y8 could not read package.json"),
  });
  const manifests: ReadonlyMap<string, PackageManifest> = new Map(
    pipe(
      Arr.zip(directories, texts),
      Arr.flatMap(([directory, text]) => Option.toArray(manifestFrom(directory)(text))),
      Arr.map((manifest): readonly [string, PackageManifest] => [manifest.directory, manifest]),
    ),
  );
  return {
    exists: (path): boolean => listed.has(path) || pipe(all, Arr.some(isUnder(path))),
    under: (directory): readonly string[] => pipe(all, Arr.filter(isUnder(directory))),
    manifestOf: (file): PackageManifest | undefined =>
      pipe(
        ancestorsOf(file),
        Arr.findFirst((directory) => Option.fromNullishOr(manifests.get(directory))),
        Option.getOrUndefined,
      ),
  } satisfies Project;
});
