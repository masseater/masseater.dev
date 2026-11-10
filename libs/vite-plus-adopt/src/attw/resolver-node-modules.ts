import { Option } from "effect";

import {
  PRIORITY_KINDS,
  extensionsOf,
  formatExtensions,
  intersectExtensions,
  subtractExtensions,
} from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { resolvePackageJsonInfo } from "./package-json.ts";
import { mangleScopedPackageNameWithTrace, parsePackageName } from "./package-names.ts";
import {
  combinePaths,
  forEachAncestorDirectory,
  getBaseFileName,
  normalizePath,
  normalizeSlashes,
} from "./paths.ts";
import type {
  ModuleLookup,
  ResolutionMode,
  ResolutionState,
  Resolved,
  SearchResult,
} from "./resolution-types.ts";
import type { PackageLocation, SpecificRequest } from "./resolver-package-loader.ts";
import { loadSubpath, resolveInPackage } from "./resolver-package.ts";
import { directoryMissing } from "./resolver-relative.ts";

interface NodeModulesSearch extends ModuleLookup {
  readonly typesScopeOnly: boolean;
}

interface NodeModulesFolder {
  readonly moduleName: string;
  readonly path: string;
  readonly exists: boolean;
}

const EMPTY = 0;

const FEATURE_NAMES: readonly (keyof ResolutionState["features"])[] = [
  "imports",
  "selfName",
  "exports",
  "patternTrailers",
  "esmMode",
];

const hasNoFeatures = ({ features }: ResolutionState): boolean =>
  !FEATURE_NAMES.some((name) => features[name]);

const cacheModeOf = (state: ResolutionState): Option.Option<ResolutionMode> => {
  if (hasNoFeatures(state)) {
    return Option.none();
  }
  if (state.features.esmMode) {
    return Option.some("ESNext");
  }
  return Option.some("CommonJS");
};

const reuseCachedResolution = (lookup: ModuleLookup, state: ResolutionState): SearchResult =>
  state.cache.pipe(
    Option.flatMap((cache) =>
      cache.getFromNonRelative({
        name: lookup.moduleName,
        mode: cacheModeOf(state),
        directory: lookup.directory,
      }),
    ),
    Option.map((result) => {
      traceMessage(state, Messages.resolutionFoundInCache, lookup.moduleName, lookup.directory);
      state.outcome.rememberResultFromCache(result);
      return result.resolvedModule.pipe(
        Option.map((module): Resolved => ({
          path: module.resolvedFileName,
          extension: module.extension,
          packageId: module.packageId,
          originalPath: module.originalPath,
          resolvedUsingTsExtension: module.resolvedUsingTsExtension,
        })),
      );
    }),
  );

const loadModuleFromSpecificNodeModulesDirectory = (
  request: SpecificRequest,
  state: ResolutionState,
): Option.Option<Resolved> => {
  const candidate = normalizePath(combinePaths(request.nodeModulesDirectory, request.moduleName));
  const { packageName, rest } = parsePackageName(request.moduleName);
  const location: PackageLocation = {
    candidate,
    rest,
    packageDirectory: combinePaths(request.nodeModulesDirectory, packageName),
    packageInfo: resolvePackageJsonInfo(candidate, !request.nodeModulesDirectoryExists, state),
  };
  if (rest.length === EMPTY) {
    return resolveInPackage(request, location, state);
  }
  return loadSubpath(request, location, state);
};

const loadFromTypesDirectory = (
  folder: NodeModulesFolder,
  state: ResolutionState,
): Option.Option<Resolved> => {
  const atTypes = combinePaths(folder.path, "@types");
  const atTypesExists = folder.exists && !directoryMissing(atTypes, state);
  return loadModuleFromSpecificNodeModulesDirectory(
    {
      extensions: extensionsOf("Declaration"),
      moduleName: mangleScopedPackageNameWithTrace(folder.moduleName, state),
      nodeModulesDirectory: atTypes,
      nodeModulesDirectoryExists: atTypesExists,
    },
    state,
  );
};

const loadFromPackageFolder = (
  search: NodeModulesSearch,
  folder: NodeModulesFolder,
  state: ResolutionState,
): Option.Option<Resolved> => {
  if (search.typesScopeOnly) {
    return Option.none();
  }
  return loadModuleFromSpecificNodeModulesDirectory(
    {
      extensions: search.extensions,
      moduleName: search.moduleName,
      nodeModulesDirectory: folder.path,
      nodeModulesDirectoryExists: folder.exists,
    },
    state,
  );
};

const loadModuleFromImmediateNodeModulesDirectory = (
  search: NodeModulesSearch,
  state: ResolutionState,
): Option.Option<Resolved> => {
  const path = combinePaths(search.directory, "node_modules");
  const folder: NodeModulesFolder = {
    moduleName: search.moduleName,
    path,
    exists: !directoryMissing(path, state),
  };
  return loadFromPackageFolder(search, folder, state).pipe(
    Option.orElse(() =>
      Option.liftPredicate(search.extensions, (extensions) =>
        extensions.includes("Declaration"),
      ).pipe(Option.flatMap(() => loadFromTypesDirectory(folder, state))),
    ),
  );
};

const lookupAncestors = (search: NodeModulesSearch, state: ResolutionState): SearchResult =>
  forEachAncestorDirectory(normalizeSlashes(search.directory), (ancestor): SearchResult => {
    if (getBaseFileName(ancestor) === "node_modules") {
      return Option.none();
    }
    const atAncestor = { ...search, directory: ancestor };
    return reuseCachedResolution(atAncestor, state).pipe(
      Option.orElse(() =>
        loadModuleFromImmediateNodeModulesDirectory(atAncestor, state).pipe(
          Option.map((resolved) => Option.some(resolved)),
        ),
      ),
    );
  });

const resolvePreferredWithTrace = (
  search: NodeModulesSearch,
  state: ResolutionState,
): SearchResult => {
  const preferred = intersectExtensions(search.extensions, PRIORITY_KINDS);
  if (preferred.length === EMPTY) {
    return Option.none();
  }
  traceMessage(state, Messages.searchingPreferredExtensions, formatExtensions(preferred));
  return lookupAncestors({ ...search, extensions: preferred }, state);
};

const resolveFallbackWithTrace = (
  search: NodeModulesSearch,
  state: ResolutionState,
): SearchResult => {
  const fallback = subtractExtensions(search.extensions, PRIORITY_KINDS);
  if (fallback.length === EMPTY || search.typesScopeOnly) {
    return Option.none();
  }
  traceMessage(state, Messages.searchingFallbackExtensions, formatExtensions(fallback));
  return lookupAncestors({ ...search, extensions: fallback }, state);
};

const loadModuleFromNearestNodeModulesDirectory = (
  search: NodeModulesSearch,
  state: ResolutionState,
): SearchResult =>
  resolvePreferredWithTrace(search, state).pipe(
    Option.orElse(() => resolveFallbackWithTrace(search, state)),
  );

export { loadModuleFromNearestNodeModulesDirectory };
export type { NodeModulesSearch };
