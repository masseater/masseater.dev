import { Array as Arr, Option, String as Str } from "effect";

import { getRootLength, isRootedDiskPath } from "./path-roots.ts";

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

const normalizeSlashes = (path: string): string => path.replaceAll("\\", SEPARATOR);

const hasTrailingDirectorySeparator = (path: string): boolean => path.endsWith(SEPARATOR);

const removeTrailingDirectorySeparator = (path: string): string =>
  Option.liftPredicate(path, hasTrailingDirectorySeparator).pipe(
    Option.match({ onNone: () => path, onSome: (value) => value.slice(FIRST, NOT_FOUND) }),
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
  const rest = path.slice(rootLength).split(SEPARATOR);
  const trimmed = Option.liftPredicate(rest, (parts) => Arr.last(parts).pipe(Option.contains("")));
  return [
    path.slice(FIRST, rootLength),
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
      `${Option.liftPredicate(root, Str.isNonEmpty).pipe(Option.match({ onNone: () => "", onSome: ensureTrailingDirectorySeparator }))}${rest.join(SEPARATOR)}`,
  });

const normalizeComponents = (path: string): string => {
  const normalized = getPathFromPathComponents(reducePathComponents(getPathComponents(path)));
  return Option.liftPredicate(
    normalized,
    (value) => value.length > FIRST && hasTrailingDirectorySeparator(path),
  ).pipe(Option.match({ onNone: () => normalized, onSome: ensureTrailingDirectorySeparator }));
};

const simplifyCurrentSegments = (path: string): string =>
  path.replaceAll("/./", SEPARATOR).replace(/^\.\//u, "");

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
  return trimmed.slice(FIRST, Math.max(rootLength, trimmed.lastIndexOf(SEPARATOR)));
};

const getBaseFileName = (path: string): string => {
  const slashed = normalizeSlashes(path);
  if (getRootLength(slashed) === slashed.length) {
    return "";
  }
  const trimmed = removeTrailingDirectorySeparator(slashed);
  return trimmed.slice(
    Math.max(getRootLength(trimmed), trimmed.lastIndexOf(SEPARATOR) + ROOT_LENGTH),
  );
};

const getNormalizedAbsolutePath = (path: string, currentDirectory: string): string => {
  const components = getPathComponents(combinePaths(currentDirectory, path));
  return getPathFromPathComponents(reducePathComponents(components));
};

const toPath = (fileName: string): string =>
  Option.liftPredicate(fileName, isRootedDiskPath).pipe(
    Option.match({
      onNone: () => getNormalizedAbsolutePath(fileName, SEPARATOR),
      onSome: normalizePath,
    }),
    Str.toLowerCase,
  );

const forEachAncestorDirectory = <Found>(
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
};

const pathIsRelative = (path: string): boolean =>
  RELATIVE_NAMES.has(path) || RELATIVE_PREFIXES.some((prefix) => path.startsWith(prefix));

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

const getRelativePathFromDirectory = (fromDirectory: string, to: string): string => {
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
};

const containsPath = (parent: string, child: string): boolean => {
  const parentComponents = reducePathComponents(getPathComponents(parent));
  const childComponents = reducePathComponents(getPathComponents(child));
  return (
    parent === child ||
    (childComponents.length >= parentComponents.length &&
      sharedPrefixLength(parentComponents, childComponents) === parentComponents.length)
  );
};

const compareStrings = (left: string, right: string): number =>
  Math.sign(Number(left > right) - Number(left < right));

const compareCaseInsensitive = (left: string, right: string): number =>
  compareStrings(left.toUpperCase(), right.toUpperCase());

const compareComponents = (left: readonly string[], right: readonly string[]): number => {
  const differing = Arr.zip(left, right)
    .slice(SECOND)
    .map(([leftComponent, rightComponent]) => compareCaseInsensitive(leftComponent, rightComponent))
    .find((result) => result !== FIRST);
  return differing ?? Math.sign(left.length - right.length);
};

const compareRests = (left: string, right: string): number => {
  if (!RELATIVE_SEGMENT.test(left) && !RELATIVE_SEGMENT.test(right)) {
    return compareCaseInsensitive(left, right);
  }
  return compareComponents(
    reducePathComponents(getPathComponents(left)),
    reducePathComponents(getPathComponents(right)),
  );
};

const comparePathsCaseInsensitive = (left: string, right: string): number => {
  const leftRoot = left.slice(FIRST, getRootLength(left));
  const rightRoot = right.slice(FIRST, getRootLength(right));
  return Option.liftPredicate(
    compareCaseInsensitive(leftRoot, rightRoot),
    (result) => result !== FIRST,
  ).pipe(
    Option.getOrElse(() =>
      compareRests(left.slice(leftRoot.length), right.slice(rightRoot.length)),
    ),
  );
};

export {
  combinePaths,
  comparePathsCaseInsensitive,
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
  toPath,
};
