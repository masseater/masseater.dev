import { MutableRef, Option, Predicate, Record as Rec, String as Str } from "effect";

import { Messages, traceMessage } from "./messages.ts";
import { asRecord, resolvePackageJsonFieldWithTrace } from "./package-json-fields.ts";
import { combinePaths, forEachAncestorDirectory, toPath } from "./paths.ts";
import type {
  PackageId,
  PackageJsonCache,
  PackageJsonCacheEntry,
  PackageJsonContent,
  PackageJsonContents,
  PackageJsonInfo,
  PathAndExtension,
  Resolved,
  ResolutionState,
} from "./resolution-types.ts";

interface PackageJsonLocation {
  readonly packageDirectory: string;
  readonly packageJsonPath: string;
}

const PACKAGE_JSON = "package.json";
const NODE_MODULES = "node_modules";
const SEPARATOR_LENGTH = 1;
const EMPTY = 0;
const BYTE_ORDER_MARK = /^﻿/u;

const memo = <Value>(): ((compute: () => Option.Option<Value>) => Option.Option<Value>) => {
  const cell = MutableRef.make(Option.none<Option.Option<Value>>());
  return (compute) => {
    const value = MutableRef.get(cell).pipe(Option.getOrElse(compute));
    MutableRef.set(cell, Option.some(value));
    return value;
  };
};

const createContents = (packageJsonContent: PackageJsonContent): PackageJsonContents => ({
  packageJsonContent,
  versionPaths: memo(),
  peerDependencies: memo(),
});

const createPackageJsonCache = (): PackageJsonCache => {
  const entries = new Map<string, PackageJsonCacheEntry>();
  return {
    get: (packageJsonPath) => Option.fromNullishOr(entries.get(toPath(packageJsonPath))),
    set: (packageJsonPath, entry) => {
      entries.set(toPath(packageJsonPath), entry);
    },
  };
};

const parseJson = (text: string): Option.Option<unknown> =>
  Option.liftThrowable((source: string): unknown => JSON.parse(source))(
    text.replace(BYTE_ORDER_MARK, ""),
  );

const readJson = (path: string, state: ResolutionState): PackageJsonContent =>
  state.host.readFile(path).pipe(
    Option.flatMap((text) => parseJson(text)),
    Option.map((value) => asRecord(value)),
    Option.getOrElse(() => ({})),
  );

const reuseCachedWithTrace = (
  { packageDirectory, packageJsonPath }: PackageJsonLocation,
  entry: PackageJsonCacheEntry,
  state: ResolutionState,
): Option.Option<PackageJsonInfo> => {
  if (entry.kind === "found") {
    traceMessage(state, Messages.fileExistsCached, packageJsonPath);
    return Option.some({ packageDirectory, contents: entry.info.contents });
  }
  if (entry.missing.directoryExists) {
    traceMessage(state, Messages.fileDoesNotExistCached, packageJsonPath);
  }
  return Option.none();
};

const remember = (
  state: ResolutionState,
  packageJsonPath: string,
  entry: PackageJsonCacheEntry,
): void => {
  for (const cache of Option.toArray(state.packageJsonCache)) {
    cache.set(packageJsonPath, entry);
  }
};

const cacheFoundWithTrace = (
  { packageDirectory, packageJsonPath }: PackageJsonLocation,
  state: ResolutionState,
): Option.Option<PackageJsonInfo> => {
  const contents = createContents(readJson(packageJsonPath, state));
  traceMessage(state, Messages.foundPackageJson, packageJsonPath);
  const info = { packageDirectory, contents };
  remember(state, packageJsonPath, { kind: "found", info });
  return Option.some(info);
};

const resolveAndCacheWithTrace = (
  location: PackageJsonLocation,
  state: ResolutionState,
): Option.Option<PackageJsonInfo> => {
  const { packageDirectory, packageJsonPath } = location;
  const directoryExists = state.host.directoryExists(packageDirectory);
  if (directoryExists && state.host.fileExists(packageJsonPath)) {
    return cacheFoundWithTrace(location, state);
  }
  if (directoryExists) {
    traceMessage(state, Messages.fileDoesNotExist, packageJsonPath);
  }
  remember(state, packageJsonPath, {
    kind: "missing",
    missing: { packageDirectory, directoryExists },
  });
  return Option.none();
};

const resolvePackageJsonInfo = (
  packageDirectory: string,
  onlyRecordFailures: boolean,
  state: ResolutionState,
): Option.Option<PackageJsonInfo> => {
  if (onlyRecordFailures) {
    return Option.none();
  }
  const location = {
    packageDirectory,
    packageJsonPath: combinePaths(packageDirectory, PACKAGE_JSON),
  };
  return state.packageJsonCache.pipe(
    Option.flatMap((cache) => cache.get(location.packageJsonPath)),
    Option.match({
      onNone: () => resolveAndCacheWithTrace(location, state),
      onSome: (entry) => reuseCachedWithTrace(location, entry, state),
    }),
  );
};

const getPackageScopeForPath = (
  directory: string,
  state: ResolutionState,
): Option.Option<PackageJsonInfo> =>
  forEachAncestorDirectory(directory, (ancestor) => resolvePackageJsonInfo(ancestor, false, state));

const peerVersion = (peer: string, nodeModules: string, state: ResolutionState): string =>
  resolvePackageJsonInfo(`${nodeModules}${peer}`, false, state).pipe(
    Option.match({
      onNone: () => {
        traceMessage(state, Messages.failedToFindPeerDependency, peer);
        return "";
      },
      onSome: (peerInfo) => {
        const version = String(peerInfo.contents.packageJsonContent["version"]);
        traceMessage(state, Messages.foundPeerDependency, peer, version);
        return `+${peer}@${version}`;
      },
    }),
  );

const nodeModulesOf = (packageDirectory: string): string =>
  `${packageDirectory.slice(EMPTY, packageDirectory.lastIndexOf(NODE_MODULES) + NODE_MODULES.length)}/`;

const resolvePeerDependenciesWithTrace = (
  info: PackageJsonInfo,
  state: ResolutionState,
): Option.Option<string> =>
  resolvePackageJsonFieldWithTrace(
    info.contents.packageJsonContent,
    { field: "peerDependencies", expected: "object" },
    state,
  ).pipe(
    Option.map((peers) => {
      traceMessage(state, Messages.packageJsonHasPeerDependencies);
      const nodeModules = nodeModulesOf(info.packageDirectory);
      return Rec.keys(asRecord(peers))
        .map((peer) => peerVersion(peer, nodeModules, state))
        .join("");
    }),
    Option.filter((joined) => Str.isNonEmpty(joined)),
  );

const getPeerDependencies = (info: PackageJsonInfo, state: ResolutionState): string =>
  info.contents
    .peerDependencies(() => resolvePeerDependenciesWithTrace(info, state))
    .pipe(Option.getOrElse(() => ""));

const packageIdOf = (
  info: PackageJsonInfo,
  resolved: PathAndExtension,
  state: ResolutionState,
): Option.Option<PackageId> => {
  const { name, version } = info.contents.packageJsonContent;
  if (!Predicate.isString(name) || !Predicate.isString(version)) {
    return Option.none();
  }
  return Option.some({
    name,
    subModuleName: resolved.path.slice(info.packageDirectory.length + SEPARATOR_LENGTH),
    version,
    peerDependencies: getPeerDependencies(info, state),
  });
};

const withPackageId = (
  info: Option.Option<PackageJsonInfo>,
  resolved: Option.Option<PathAndExtension>,
  state: ResolutionState,
): Option.Option<Resolved> =>
  resolved.pipe(
    Option.map((value): Resolved => ({
      path: value.path,
      extension: value.extension,
      resolvedUsingTsExtension: value.resolvedUsingTsExtension,
      packageId: info.pipe(Option.flatMap((packageInfo) => packageIdOf(packageInfo, value, state))),
      originalPath: Option.none(),
    })),
  );

const qualifiedName = (packageId: PackageId): string => {
  if (packageId.subModuleName.length > EMPTY) {
    return `${packageId.name}/${packageId.subModuleName}`;
  }
  return packageId.name;
};

const packageIdToString = (packageId: PackageId): string =>
  `${qualifiedName(packageId)}@${packageId.version}${packageId.peerDependencies}`;

export {
  createPackageJsonCache,
  getPackageScopeForPath,
  packageIdToString,
  resolvePackageJsonInfo,
  withPackageId,
};
