import {
  Array as Arr,
  Effect,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { FileSystem, PlatformError } from "effect";
import type { HttpClient } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";

import { loadViteConfig } from "#/entities/vite-config/index.ts";
import { RemoteSkillSourceSchema, SkillsSectionSchema } from "#/shared/config/index.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

import { skillCacheDirectory } from "./cache.ts";
import { linkSkills } from "./link.ts";
import type { Link } from "./link.ts";
import { resolveLocal } from "./local.ts";
import { resolveSource } from "./source.ts";
import type { Resolved } from "./source.ts";

/** @internal */
export type InstallServices =
  | FileSystem.FileSystem
  | Path.Path
  | HttpClient.HttpClient
  | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
export type InstallError = VpToolsError | PlatformError.PlatformError;

type Section = typeof SkillsSectionSchema.Type;

type Entry = readonly [string, Section[string]];

const isRemote = Schema.is(RemoteSkillSourceSchema);

const LOCAL_PREFIX = "./";

const SINGLE = 1;

const decodeSection = (raw: unknown): Effect.Effect<Section, VpToolsError> =>
  Schema.decodeUnknownEffect(SkillsSectionSchema)(raw, { onExcessProperty: "error" }).pipe(
    Effect.mapError((failure) => checksFailed(`vite.config "skills": ${failure.message}`)),
  );

interface Named extends Link {
  readonly repository: string;
}

const namedLinks =
  (path: Path.Path) =>
  ({ repository, names, directory }: Resolved): readonly Named[] =>
    pipe(
      names,
      Arr.map((name) => ({ name, repository, target: path.join(directory, name) })),
    );

const describeClash = ([name, group]: readonly [string, readonly Named[]]): string =>
  `${name} (${Arr.join(
    pipe(
      group,
      Arr.map(({ repository }) => repository),
    ),
    ", ",
  )})`;

const linksOf = (
  resolved: readonly Resolved[],
): Effect.Effect<readonly Link[], VpToolsError, Path.Path> =>
  Effect.gen(function* collectLinks() {
    const path = yield* Path.Path;
    const links = pipe(resolved, Arr.flatMap(namedLinks(path)));
    const clashes = pipe(
      links,
      Arr.groupBy(({ name }) => name),
      Rec.filter((group) => group.length > SINGLE),
      Rec.toEntries,
      Arr.map(describeClash),
    );
    if (Arr.isReadonlyArrayNonEmpty(clashes)) {
      return yield* checksFailed(`More than one source provides ${Arr.join(clashes, "; ")}`);
    }
    return pipe(
      links,
      Arr.map(({ name, target }): Link => ({ name, target })),
    );
  });

const resolveEntry =
  (root: string, cache: string) =>
  ([key, source]: Entry): Effect.Effect<Resolved, InstallError, InstallServices> => {
    const local = Str.startsWith(LOCAL_PREFIX)(key);
    if (isRemote(source)) {
      if (local) {
        return Effect.fail(
          checksFailed(
            `vite.config "skills": ${key} is a folder in this repository and takes no commit`,
          ),
        );
      }
      return resolveSource(cache)({ repository: key, source });
    }
    if (!local) {
      return Effect.fail(checksFailed(`vite.config "skills": ${key} needs a commit`));
    }
    return resolveLocal(root)({ directory: key, skills: source.skills });
  };

/** @internal */
export const installSkills = (
  root: string,
): Effect.Effect<Option.Option<number>, InstallError, InstallServices> =>
  Effect.gen(function* install() {
    const config = yield* loadViteConfig(root);
    const raw = Option.fromNullishOr(config.skills);
    if (Option.isNone(raw)) {
      return Option.none();
    }
    const section = yield* decodeSection(raw.value);
    const cache = yield* skillCacheDirectory;
    const resolved = yield* Effect.forEach(Rec.toEntries(section), resolveEntry(root, cache), {
      concurrency: "unbounded",
    });
    const links = yield* linksOf(resolved);
    yield* linkSkills(root)(links);
    return Option.some(links.length);
  });
