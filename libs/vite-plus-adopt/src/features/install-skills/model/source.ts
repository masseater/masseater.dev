import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect";
import type { HttpClient } from "effect/http";

import type { VpToolsError } from "#/shared/lib/errors.ts";
import type { TarEntry } from "#/shared/lib/tar-gz.ts";

import { SEPARATOR, downloadEntries, labelOf, skillsIn } from "./archive.ts";
import type { Declared, FoundSkill } from "./archive.ts";
import { INDEX, extractSkill, writeIndex } from "./extract.ts";
import { selectSkills } from "./select.ts";

/** @internal */
export interface Resolved {
  readonly repository: string;
  readonly names: readonly string[];
  readonly directory: string;
}

/** @internal */
export type SourceServices = FileSystem.FileSystem | Path.Path | HttpClient.HttpClient;

/** @internal */
export type SourceError = VpToolsError | PlatformError.PlatformError;

const Index = Schema.fromJsonString(Schema.Array(Schema.String));

const readIndex = (
  directory: string,
): Effect.Effect<Option.Option<readonly string[]>, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* readIndexFile() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const text = yield* fs.readFileString(path.join(directory, INDEX));
    return yield* Schema.decodeEffect(Index)(text);
  }).pipe(Effect.option);

const isPresent =
  (directory: string) =>
  (name: string): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* checkPresent() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      return yield* fs.exists(path.join(directory, name));
    }).pipe(Effect.orElseSucceed(() => false));

const missingFrom = (
  directory: string,
  names: readonly string[],
): Effect.Effect<readonly string[], never, FileSystem.FileSystem | Path.Path> =>
  pipe(
    names,
    Effect.filter((name) => isPresent(directory)(name).pipe(Effect.map((present) => !present))),
  );

const cachedNames = (
  declared: Declared,
  directory: string,
): Effect.Effect<
  Option.Option<readonly string[]>,
  VpToolsError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* fromCache() {
    const index = yield* readIndex(directory);
    if (Option.isNone(index)) {
      return Option.none();
    }
    const names = yield* selectSkills({ label: labelOf(declared), skills: declared.source.skills })(
      index.value,
    );
    const missing = yield* missingFrom(directory, names);
    return Option.liftPredicate(names, () => Arr.isReadonlyArrayEmpty(missing));
  });

const extractMissing =
  (entries: readonly TarEntry[], directory: string) =>
  (skill: FoundSkill): Effect.Effect<void, SourceError, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* extractIfMissing() {
      const path = yield* Path.Path;
      const present = yield* isPresent(directory)(skill.name);
      if (!present) {
        yield* extractSkill({ skill, target: path.join(directory, skill.name) })(entries);
      }
    });

const fetchNames = (
  declared: Declared,
  directory: string,
): Effect.Effect<readonly string[], SourceError, SourceServices> =>
  Effect.gen(function* fromArchive() {
    const entries = yield* downloadEntries(declared);
    const found = yield* skillsIn(declared)(entries);
    const available = pipe(
      found,
      Arr.map(({ name }) => name),
    );
    const selected = yield* selectSkills({
      label: labelOf(declared),
      skills: declared.source.skills,
    })(available);
    yield* Effect.forEach(
      pipe(
        found,
        Arr.filter(({ name }) => Arr.contains(selected, name)),
      ),
      extractMissing(entries, directory),
      { concurrency: 1, discard: true },
    );
    yield* writeIndex(directory)(available);
    return selected;
  });

/** @internal */
export const resolveSource =
  (cache: string) =>
  (declared: Declared): Effect.Effect<Resolved, SourceError, SourceServices> =>
    Effect.gen(function* resolve() {
      const path = yield* Path.Path;
      const directory = path.join(
        cache,
        ...Str.split(SEPARATOR)(declared.repository),
        declared.source.commit,
      );
      const cached = yield* cachedNames(declared, directory);
      const names = yield* Option.match(cached, {
        onNone: () => fetchNames(declared, directory),
        onSome: Effect.succeed,
      });
      return { repository: declared.repository, names, directory };
    });
