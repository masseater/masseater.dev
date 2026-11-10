import { Array as Arr, Option, String as Str, pipe, Function as Fn } from "effect";

import { getRootLength, isRootedDiskPath } from "./path-roots.ts";

const DATA_FIRST_ARITY = 2;

const SEPARATOR = "/";
const ROOT_LENGTH = 1;
const NOT_FOUND = -1;
const FIRST = 0;
const SECOND = 1;
const PARENT = "..";
const CURRENT = ".";
const RELATIVE_SEGMENT = /\/\/|(?:^|\/)\.\.?(?:$|\/)/u;
const RELATIVE_NAMES: ReadonlySet<string> = new Set([".", ".."]);
const RELATIVE_PREFIXES: readonly string[] = ["./", ".\\", "../", "..\\"];

const normalizeSlashes = (path: string): string => Str.replaceAll("\\", SEPARATOR)(path);

const hasTrailingDirectorySeparator = (path: string): boolean => Str.endsWith(SEPARATOR)(path);

const removeTrailingDirectorySeparator = (path: string): string =>
  Option.liftPredicate(path, hasTrailingDirectorySeparator).pipe(
    Option.match({ onNone: () => path, onSome: (value) => Str.slice(FIRST, NOT_FOUND)(value) }),
  );

const ensureTrailingDirectorySeparator = (path: string): string =>
  Option.liftPredicate(path, hasTrailingDirectorySeparator).pipe(
    Option.getOrElse(() => `${path}${SEPARATOR}`),
  );

const combineTwo = (base: string, next: string): string => {
  if (next.length === FIRST) {
    return base;
  }
  const relative = normalizeSlashes(next);
  if (base.length === FIRST || getRootLength(relative) !== FIRST) {
    return relative;
  }
  return `${ensureTrailingDirectorySeparator(base)}${relative}`;
};

const combinePaths = (path: string, ...paths: readonly string[]): string =>
  Arr.reduce(paths, normalizeSlashes(path), combineTwo);

const pathComponents = (path: string, rootLength: number): readonly string[] => {
  const rest = Str.split(Str.slice(rootLength)(path), SEPARATOR);
  const trimmed = Option.liftPredicate(rest, (parts) => Arr.last(parts).pipe(Option.contains("")));
  return [
    Str.slice(FIRST, rootLength)(path),
    ...Option.match(trimmed, {
      onNone: () => rest,
      onSome: (parts) => parts.slice(FIRST, NOT_FOUND),
    }),
  ];
};

const getPathComponents = (path: string): readonly string[] => {
  const normalized = normalizeSlashes(path);
  return pathComponents(normalized, getRootLength(normalized));
};

const isNoopComponent = (component: string): boolean =>
  component.length === FIRST || component === CURRENT;

const canPopParent = (reduced: readonly string[]): boolean =>
  reduced.length > SECOND && Arr.last(reduced).pipe(Option.exists((last) => last !== PARENT));

const keepsParent = (reduced: readonly string[]): boolean =>
  reduced.length > SECOND || reduced[FIRST] === "";

const applyParent = (reduced: readonly string[], component: string): readonly string[] => {
  if (canPopParent(reduced)) {
    return reduced.slice(FIRST, NOT_FOUND);
  }
  if (keepsParent(reduced)) {
    return [...reduced, component];
  }
  return reduced;
};

const reduceComponent = (reduced: readonly string[], component: string): readonly string[] => {
  if (isNoopComponent(component)) {
    return reduced;
  }
  if (component !== PARENT) {
    return [...reduced, component];
  }
  return applyParent(reduced, component);
};

const reducePathComponents = (components: readonly string[]): readonly string[] =>
  Arr.match(components, {
    onEmpty: (): readonly string[] => [],
    onNonEmpty: ([root, ...rest]) => Arr.reduce(rest, [root], reduceComponent),
  });

const getPathFromPathComponents = (components: readonly string[]): string =>
  Arr.match(components, {
    onEmpty: () => "",
    onNonEmpty: ([root, ...rest]) =>
      `${Option.liftPredicate(root, Str.isNonEmpty).pipe(Option.match({ onNone: () => "", onSome: ensureTrailingDirectorySeparator }))}${pipe(rest, Arr.join(SEPARATOR))}`,
  });

const normalizeComponents = (path: string): string => {
  const normalized = getPathFromPathComponents(reducePathComponents(getPathComponents(path)));
  return Option.liftPredicate(
    normalized,
    (value) => value.length > FIRST && hasTrailingDirectorySeparator(path),
  ).pipe(Option.match({ onNone: () => normalized, onSome: ensureTrailingDirectorySeparator }));
};

const simplifyCurrentSegments = (path: string): string =>
  Str.replace(/^\.\//u, "")(Str.replaceAll("/./", SEPARATOR)(path));

const normalizePath = (path: string): string => {
  const slashed = normalizeSlashes(path);
  if (!RELATIVE_SEGMENT.test(slashed)) {
    return slashed;
  }
  const simplified = simplifyCurrentSegments(slashed);
  if (!RELATIVE_SEGMENT.test(simplified)) {
    return simplified;
  }
  return normalizeComponents(simplified);
};

const getDirectoryPath = (path: string): string => {
  const slashed = normalizeSlashes(path);
  const rootLength = getRootLength(slashed);
  if (rootLength === slashed.length) {
    return slashed;
  }
  const trimmed = removeTrailingDirectorySeparator(slashed);
  const end = Option.match(Str.lastIndexOf(SEPARATOR)(trimmed), {
    onNone: () => rootLength,
    onSome: (separator) => Math.max(rootLength, separator),
  });
  return Str.slice(FIRST, end)(trimmed);
};

const getBaseFileName = (path: string): string => {
  const slashed = normalizeSlashes(path);
  if (getRootLength(slashed) === slashed.length) {
    return "";
  }
  const trimmed = removeTrailingDirectorySeparator(slashed);
  const rootLength = getRootLength(trimmed);
  const start = Option.match(Str.lastIndexOf(SEPARATOR)(trimmed), {
    onNone: () => rootLength,
    onSome: (separator) => Math.max(rootLength, separator + ROOT_LENGTH),
  });
  return Str.slice(start)(trimmed);
};

const getNormalizedAbsolutePath: {
  (currentDirectory: string): (path: string) => string;
  (path: string, currentDirectory: string): string;
} = Fn.dual(DATA_FIRST_ARITY, (path: string, currentDirectory: string): string => {
  const components = getPathComponents(combinePaths(currentDirectory, path));
  return getPathFromPathComponents(reducePathComponents(components));
});

const toPath = (fileName: string): string =>
  Option.liftPredicate(fileName, isRootedDiskPath).pipe(
    Option.match({
      onNone: () => getNormalizedAbsolutePath(fileName, SEPARATOR),
      onSome: normalizePath,
    }),
    Str.toLowerCase,
  );

const forEachAncestorDirectory: {
  <Found>(
    visit: (ancestor: string) => Option.Option<Found>,
  ): (directory: string) => Option.Option<Found>;
  <Found>(
    directory: string,
    visit: (ancestor: string) => Option.Option<Found>,
  ): Option.Option<Found>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Found>(
    directory: string,
    visit: (ancestor: string) => Option.Option<Found>,
  ): Option.Option<Found> => {
    let current = directory;
    for (;;) {
      const result = visit(current);
      const parent = getDirectoryPath(current);
      if (Option.isSome(result) || parent === current) {
        return result;
      }
      current = parent;
    }
  },
);

const pathIsRelative = (path: string): boolean =>
  RELATIVE_NAMES.has(path) ||
  pipe(
    RELATIVE_PREFIXES,
    Arr.some((prefix) => Str.startsWith(prefix)(path)),
  );

const isExternalModuleNameRelative = (moduleName: string): boolean =>
  pathIsRelative(moduleName) || isRootedDiskPath(moduleName);

const sharedPrefixLength = (from: readonly string[], to: readonly string[]): number => {
  const limit = Math.min(from.length, to.length);
  let index = FIRST;
  while (index < limit && from[index] === to[index]) {
    index += ROOT_LENGTH;
  }
  return index;
};

const getRelativePathFromDirectory: {
  (to: string): (fromDirectory: string) => string;
  (fromDirectory: string, to: string): string;
} = Fn.dual(DATA_FIRST_ARITY, (fromDirectory: string, to: string): string => {
  const from = reducePathComponents(getPathComponents(fromDirectory));
  const target = reducePathComponents(getPathComponents(to));
  const start = sharedPrefixLength(from, target);
  if (start === FIRST) {
    return getPathFromPathComponents(target);
  }
  return getPathFromPathComponents([
    "",
    ...Array.from({ length: from.length - start }, () => PARENT),
    ...target.slice(start),
  ]);
});

const containsPath: {
  (child: string): (parent: string) => boolean;
  (parent: string, child: string): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (parent: string, child: string): boolean => {
  const parentComponents = reducePathComponents(getPathComponents(parent));
  const childComponents = reducePathComponents(getPathComponents(child));
  return (
    parent === child ||
    (childComponents.length >= parentComponents.length &&
      sharedPrefixLength(parentComponents, childComponents) === parentComponents.length)
  );
});

export {
  combinePaths,
  containsPath,
  ensureTrailingDirectorySeparator,
  forEachAncestorDirectory,
  getBaseFileName,
  getDirectoryPath,
  getNormalizedAbsolutePath,
  getPathComponents,
  getRelativePathFromDirectory,
  hasTrailingDirectorySeparator,
  isExternalModuleNameRelative,
  normalizePath,
  normalizeSlashes,
  pathIsRelative,
  RELATIVE_SEGMENT,
  reducePathComponents,
  toPath,
};
