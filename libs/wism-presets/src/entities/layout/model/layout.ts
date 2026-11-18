import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Kind, Layers } from "#/entities/kind/@x/layout.ts";
import { matcher } from "#/shared/lib/glob.ts";
import type { Matcher } from "#/shared/lib/glob.ts";
import { memoize } from "#/shared/lib/memo.ts";
import { ancestors, baseName, inside, join, parent } from "#/shared/lib/path.ts";

import { IGNORED, OUTSIDE, globsOf, locateRest } from "./position.ts";
import type { LayerGlobs, Position } from "./position.ts";

export interface Instance {
  readonly kind: Kind;
  readonly dir: string;
}

export interface Located {
  readonly instance: Instance;
  readonly position: Position;
}

export interface Layout {
  readonly files: readonly string[];
  readonly instances: readonly Instance[];
  readonly exists: (path: string) => boolean;
  readonly owners: (file: string) => readonly Instance[];
  readonly inner: (instance: Instance) => (path: string) => Option.Option<string>;
  readonly isEntry: (instance: Instance) => (inner: string) => boolean;
  readonly isOpen: (instance: Instance) => (rest: string) => boolean;
  readonly locate: (instance: Instance) => (path: string) => Position;
  readonly located: (path: string) => readonly Located[];
}

const ROOT_PATH = ".";

const dirPath = (dir: string): string =>
  pipe(
    Option.some(dir),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => ROOT_PATH),
  );

const markerDir =
  (marker: string) =>
  (file: string): Option.Option<string> =>
    pipe(
      Option.some(file),
      Option.filter((path) => baseName(path) === marker),
      Option.map((path) => parent(path)),
    );

const instancesOf =
  (files: readonly string[]) =>
  (kind: Kind): readonly Instance[] => {
    const wanted = Option.map(Option.fromNullishOr(kind.paths), matcher);
    const allowed = (dir: string): boolean =>
      Option.match(wanted, { onNone: () => true, onSome: (paths) => paths(dirPath(dir)) });
    const instanceAt = (file: string): Option.Option<Instance> =>
      pipe(
        markerDir(kind.marker)(file),
        Option.filter(allowed),
        Option.map((dir) => ({ kind, dir })),
      );
    return pipe(files, Arr.map(instanceAt), Arr.getSomes);
  };

interface Index {
  readonly instances: readonly Instance[];
  readonly byDir: Readonly<Record<string, readonly Instance[]>>;
  readonly globsFor: (kind: Kind) => Option.Option<LayerGlobs>;
  readonly isEntryDir: (dir: string) => boolean;
  readonly isPath: (path: string) => boolean;
}

const globsByKind = (kinds: readonly Kind[]): ((kind: Kind) => Option.Option<LayerGlobs>) => {
  const globs = new Map(
    pipe(
      kinds,
      Arr.map((kind) =>
        Option.map(Option.fromNullishOr(kind.layers), (layers) => [kind, globsOf(layers)] as const),
      ),
      Arr.getSomes,
    ),
  );
  return (kind) => Option.fromNullishOr(globs.get(kind));
};

const entryDirsOf = (
  kinds: readonly Kind[],
  files: readonly string[],
): ((dir: string) => boolean) => {
  const entries = pipe(
    kinds,
    Arr.map((kind) => Option.fromNullishOr(kind.layers)),
    Arr.getSomes,
    Arr.map((layers) => globsOf(layers).entries),
  );
  const isEntryFile = (file: string): boolean =>
    pipe(
      entries,
      Arr.some((entry) => entry(baseName(file))),
    );
  const dirs = new Set(
    pipe(
      files,
      Arr.filter(isEntryFile),
      Arr.map((file) => parent(file)),
    ),
  );
  return (dir) => dirs.has(dir);
};

const pathsOf = (files: readonly string[]): ((path: string) => boolean) => {
  const paths = new Set([...files, ...pipe(files, Arr.flatMap(ancestors))]);
  return (path) => paths.has(path);
};

const indexOf = (kinds: readonly Kind[], files: readonly string[]): Index => {
  const instances = pipe(kinds, Arr.flatMap(instancesOf(files)));
  return {
    instances,
    byDir: Arr.groupBy(instances, ({ dir }) => dir),
    globsFor: globsByKind(kinds),
    isEntryDir: entryDirsOf(kinds, files),
    isPath: pathsOf(files),
  };
};

const ownersIn =
  ({ byDir }: Readonly<Index>) =>
  (file: string): readonly Instance[] =>
    pipe(
      ancestors(file),
      Arr.findFirst((dir) => Rec.get(byDir, dir)),
      Option.getOrElse((): readonly Instance[] => []),
    );

const inner =
  (instance: Instance) =>
  (path: string): Option.Option<string> =>
    inside(instance.dir)(path);

const scopeOf =
  ({ isEntryDir }: Readonly<Index>, instance: Instance) =>
  (layers: Layers, globs: LayerGlobs): ((rest: string) => Position) => {
    const base = join(instance.dir)(layers.dir);
    return locateRest({ layers, globs, isSlice: (sub) => isEntryDir(join(base)(sub)) });
  };

const locateIn =
  (index: Readonly<Index>) =>
  (instance: Instance) =>
  (path: string): Position => {
    const layerGlobs = index.globsFor(instance.kind);
    const layers = Option.fromNullishOr(instance.kind.layers);
    const within = inner(instance)(path);
    return pipe(
      Option.all({ layers, layerGlobs, within }),
      Option.filter((found) => found.layerGlobs.files(found.within)),
      Option.map((found) =>
        Option.match(inside(found.layers.dir)(found.within), {
          onNone: () => OUTSIDE,
          onSome: scopeOf(index, instance)(found.layers, found.layerGlobs),
        }),
      ),
      Option.getOrElse(() => IGNORED),
    );
  };

const globMatches =
  ({ globsFor }: Readonly<Index>, pick: (layerGlobs: LayerGlobs) => Matcher) =>
  (instance: Instance) =>
  (path: string): boolean =>
    pipe(
      globsFor(instance.kind),
      Option.exists((layerGlobs) => pick(layerGlobs)(path)),
    );

const perInstance = (
  locate: (instance: Instance) => (path: string) => Position,
): ((instance: Instance) => (path: string) => Position) => {
  const cache = new WeakMap<Instance, (path: string) => Position>();
  const store = (instance: Instance): ((path: string) => Position) => {
    const located = memoize(locate(instance));
    cache.set(instance, located);
    return located;
  };
  return (instance) =>
    Option.getOrElse(Option.fromNullishOr(cache.get(instance)), () => store(instance));
};

export const makeLayout =
  (kinds: readonly Kind[]) =>
  (files: readonly string[]): Layout => {
    const index = indexOf(kinds, files);
    const owners = memoize(ownersIn(index));
    const locate = perInstance(locateIn(index));
    return {
      files,
      instances: index.instances,
      exists: (path) => Str.isEmpty(path) || index.isPath(path),
      owners,
      inner,
      isEntry: globMatches(index, ({ entries }) => entries),
      isOpen: globMatches(index, ({ open }) => open),
      locate,
      located: memoize((path) =>
        pipe(
          owners(path),
          Arr.map((instance) => ({ instance, position: locate(instance)(path) })),
        ),
      ),
    };
  };
