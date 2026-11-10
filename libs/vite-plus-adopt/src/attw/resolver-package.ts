import { Option, Predicate } from "effect";

import { resolvePackageJsonInfo, withPackageId } from "./package-json.ts";
import { combinePaths } from "./paths.ts";
import type {
  CandidateRequest,
  PackageJsonInfo,
  Resolved,
  ResolutionState,
} from "./resolution-types.ts";
import { loadModuleFromExports } from "./resolver-exports.ts";
import { loadModuleFromFile } from "./resolver-files.ts";
import {
  loadFromDirectory,
  resolveVersionPathsWithTrace,
  specificLoader,
} from "./resolver-package-loader.ts";
import type { PackageLocation, PackagePaths, SpecificRequest } from "./resolver-package-loader.ts";

const loadSubpathWithoutExports = (
  request: SpecificRequest,
  location: PackagePaths & { readonly packageInfo: PackageJsonInfo },
  state: ResolutionState,
): Option.Option<Resolved> => {
  const candidateRequest: CandidateRequest = {
    extensions: request.extensions,
    candidate: location.candidate,
    onlyRecordFailures: !request.nodeModulesDirectoryExists,
  };
  const fromFile = loadModuleFromFile(candidateRequest, state);
  if (Option.isSome(fromFile)) {
    return withPackageId(Option.none(), fromFile, state);
  }
  const packageInfo = Option.some(location.packageInfo);
  const fromDirectory = loadFromDirectory(candidateRequest, packageInfo, state);
  return withPackageId(packageInfo, fromDirectory, state);
};

const rootHasExports = (rootInfo: Option.Option<PackageJsonInfo>): boolean =>
  Option.exists(rootInfo, (info) => Object.hasOwn(info.contents.packageJsonContent, "exports"));

const resolveInPackage = (
  request: SpecificRequest,
  location: PackageLocation,
  state: ResolutionState,
): Option.Option<Resolved> => {
  if (Option.isSome(location.packageInfo)) {
    state.outcome.markResolvedPackageDirectory();
  }
  const exportsInfo = location.packageInfo.pipe(
    Option.filter(
      (info) =>
        state.features.exports && Predicate.isTruthy(info.contents.packageJsonContent["exports"]),
    ),
  );
  if (Option.isSome(exportsInfo)) {
    const subpath = combinePaths(".", location.rest);
    return loadModuleFromExports(
      exportsInfo.value,
      { extensions: request.extensions, subpath },
      state,
    ).pipe(Option.flatten);
  }
  return resolveVersionPathsWithTrace(request, location, state).pipe(
    Option.getOrElse(() =>
      specificLoader(location.packageInfo, location.rest)(
        {
          extensions: request.extensions,
          candidate: location.candidate,
          onlyRecordFailures: !request.nodeModulesDirectoryExists,
        },
        state,
      ),
    ),
  );
};

const loadSubpathOfNestedPackage = (
  request: SpecificRequest,
  location: PackagePaths & { readonly packageInfo: PackageJsonInfo },
  state: ResolutionState,
): Option.Option<Resolved> => {
  if (!state.features.exports) {
    return loadSubpathWithoutExports(request, location, state);
  }
  const missing = !request.nodeModulesDirectoryExists;
  const rootInfo = resolvePackageJsonInfo(location.packageDirectory, missing, state);
  if (!rootHasExports(rootInfo)) {
    return loadSubpathWithoutExports(request, location, state);
  }
  return resolveInPackage(request, { ...location, packageInfo: rootInfo }, state);
};

const loadSubpath = (
  request: SpecificRequest,
  location: PackageLocation,
  state: ResolutionState,
): Option.Option<Resolved> => {
  if (Option.isSome(location.packageInfo)) {
    return loadSubpathOfNestedPackage(
      request,
      { ...location, packageInfo: location.packageInfo.value },
      state,
    );
  }
  const missing = !request.nodeModulesDirectoryExists;
  const packageInfo = resolvePackageJsonInfo(location.packageDirectory, missing, state);
  return resolveInPackage(request, { ...location, packageInfo }, state);
};

export { loadSubpath, resolveInPackage };
