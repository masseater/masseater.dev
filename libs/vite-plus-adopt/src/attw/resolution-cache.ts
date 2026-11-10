import { Option } from "effect";

import { createPackageJsonCache } from "./package-json.ts";
import { getDirectoryPath, toPath } from "./paths.ts";
import type {
  ModuleResolutionCache,
  ResolutionMode,
  ResolutionResult,
} from "./resolution-types.ts";

const NEXT = 1;
const START = 0;
const ROOT_LENGTH = 1;
const NOT_FOUND = -1;

const modeKey = (name: string, mode: Option.Option<ResolutionMode>): string =>
  `${Option.getOrElse(mode, () => "")}|${name}`;

const resolvedFileNameOf = (result: ResolutionResult): Option.Option<string> =>
  result.resolvedModule.pipe(
    Option.map((module) => Option.getOrElse(module.originalPath, () => module.resolvedFileName)),
  );

const sharedLength = (left: string, right: string): number => {
  const limit = Math.min(left.length, right.length);
  let index = START;
  while (index < limit && left[index] === right[index]) {
    index += NEXT;
  }
  return index;
};

const isWholeDirectoryShared = (
  directory: string,
  resolutionDirectory: string,
  index: number,
): boolean =>
  index === directory.length &&
  (resolutionDirectory.length === index || resolutionDirectory[index] === "/");

const enclosingDirectory = (directory: string, index: number): Option.Option<string> =>
  Option.liftPredicate(
    directory.lastIndexOf("/", index - NEXT),
    (separator) => separator !== NOT_FOUND,
  ).pipe(Option.map((separator) => directory.slice(START, Math.max(separator, ROOT_LENGTH))));

const getCommonPrefix = (directory: string, resolution: string): Option.Option<string> => {
  const resolutionDirectory = toPath(getDirectoryPath(resolution));
  const index = sharedLength(directory, resolutionDirectory);
  if (isWholeDirectoryShared(directory, resolutionDirectory, index)) {
    return Option.some(directory);
  }
  if (index < ROOT_LENGTH) {
    return Option.none();
  }
  return enclosingDirectory(directory, index);
};

const ancestorsToCache = (
  path: string,
  result: ResolutionResult,
  isCached: (directory: string) => boolean,
): readonly string[] => {
  const commonPrefix = resolvedFileNameOf(result).pipe(
    Option.flatMap((fileName) => getCommonPrefix(path, fileName)),
  );
  const directories = [path];
  let current = path;
  let parent = getDirectoryPath(current);
  while (!Option.contains(commonPrefix, current) && parent !== current && !isCached(parent)) {
    directories.push(parent);
    current = parent;
    parent = getDirectoryPath(current);
  }
  return directories;
};

interface ResultTables {
  readonly get: (outer: string, inner: string) => Option.Option<ResolutionResult>;
  readonly tableFor: (outer: string) => Map<string, ResolutionResult>;
}

const createResultTables = (): ResultTables => {
  const tables = new Map<string, Map<string, ResolutionResult>>();
  return {
    get: (outer, inner) =>
      Option.fromNullishOr(tables.get(outer)).pipe(
        Option.flatMap((table) => Option.fromNullishOr(table.get(inner))),
      ),
    tableFor: (outer) => {
      const table = tables.get(outer) ?? new Map<string, ResolutionResult>();
      tables.set(outer, table);
      return table;
    },
  };
};

const createModuleResolutionCache = (): ModuleResolutionCache => {
  const perDirectory = createResultTables();
  const nonRelative = createResultTables();
  return {
    packageJson: createPackageJsonCache(),
    getFromDirectory: (key) => perDirectory.get(toPath(key.directory), modeKey(key.name, key.mode)),
    setForDirectory: (key, result) => {
      perDirectory.tableFor(toPath(key.directory)).set(modeKey(key.name, key.mode), result);
    },
    getFromNonRelative: (key) =>
      nonRelative.get(modeKey(key.name, key.mode), toPath(key.directory)),
    setForNonRelative: (key, result) => {
      const table = nonRelative.tableFor(modeKey(key.name, key.mode));
      const path = toPath(key.directory);
      if (table.has(path)) {
        return;
      }
      for (const directory of ancestorsToCache(path, result, (candidate) => table.has(candidate))) {
        table.set(directory, result);
      }
    },
  };
};

export { createModuleResolutionCache, modeKey };
