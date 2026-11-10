import { Option, Predicate } from "effect";

import { Messages, traceMessage } from "./messages.ts";
import { withPackageId } from "./package-json.ts";
import { tryLoadModuleUsingPaths } from "./paths-mapping.ts";
import type { Loader } from "./paths-mapping.ts";
import { combinePaths } from "./paths.ts";
import type {
  CandidateRequest,
  PackageJsonInfo,
  PathAndExtension,
  Resolved,
  ResolutionState,
} from "./resolution-types.ts";
import { loadNodeModuleFromDirectoryWorker } from "./resolver-directory.ts";
import { loadModuleFromFile } from "./resolver-files.ts";
import { nodeLoadModuleByRelativeName } from "./resolver-relative.ts";
import { RESOLUTION_VERSION, getVersionPaths } from "./types-versions.ts";

interface SpecificRequest {
  readonly extensions: CandidateRequest["extensions"];
  readonly moduleName: string;
  readonly nodeModulesDirectory: string;
  readonly nodeModulesDirectoryExists: boolean;
}

interface PackagePaths {
  readonly candidate: string;
  readonly rest: string;
  readonly packageDirectory: string;
}

interface PackageLocation extends PackagePaths {
  readonly packageInfo: Option.Option<PackageJsonInfo>;
}

const EMPTY = 0;

const loadFromDirectory = (
  request: CandidateRequest,
  packageInfo: Option.Option<PackageJsonInfo>,
  state: ResolutionState,
): Option.Option<PathAndExtension> =>
  loadNodeModuleFromDirectoryWorker(
    {
      ...request,
      jsonContent: packageInfo.pipe(Option.map((info) => info.contents.packageJsonContent)),
      versionPaths: packageInfo.pipe(Option.flatMap((info) => getVersionPaths(info, state))),
      loadRelative: nodeLoadModuleByRelativeName,
    },
    state,
  );

const loadEsmIndexFallback = (
  request: CandidateRequest,
  packageInfo: Option.Option<PackageJsonInfo>,
  state: ResolutionState,
): Option.Option<PathAndExtension> =>
  packageInfo.pipe(
    Option.filter(
      (info) =>
        state.features.esmMode && Predicate.isNullish(info.contents.packageJsonContent["exports"]),
    ),
    Option.flatMap(() =>
      loadModuleFromFile(
        { ...request, candidate: combinePaths(request.candidate, "index.js") },
        state,
      ),
    ),
  );

const loadFileFirst = (
  request: CandidateRequest,
  rest: string,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  if (rest.length > EMPTY || !state.features.esmMode) {
    return loadModuleFromFile(request, state);
  }
  return Option.none();
};

const specificLoader =
  (packageInfo: Option.Option<PackageJsonInfo>, rest: string): Loader<Resolved> =>
  (request, state) => {
    const pathAndExtension = loadFileFirst(request, rest, state).pipe(
      Option.orElse(() => loadFromDirectory(request, packageInfo, state)),
      Option.orElse(() => loadEsmIndexFallback(request, packageInfo, state)),
    );
    return withPackageId(packageInfo, pathAndExtension, state);
  };

const withoutPackageMetadata = (file: PathAndExtension): Resolved => ({
  ...file,
  packageId: Option.none(),
  originalPath: Option.none(),
});

const resolveVersionPathsWithTrace = (
  request: SpecificRequest,
  location: PackageLocation,
  state: ResolutionState,
): Option.Option<Option.Option<Resolved>> =>
  Option.liftPredicate(location.rest, (rest) => rest.length > EMPTY).pipe(
    Option.flatMap(() =>
      location.packageInfo.pipe(Option.flatMap((info) => getVersionPaths(info, state))),
    ),
    Option.flatMap((versionPaths) => {
      traceMessage(
        state,
        Messages.packageJsonTypesVersionsMatch,
        versionPaths.version,
        RESOLUTION_VERSION,
        location.rest,
      );
      const packageDirectoryExists =
        request.nodeModulesDirectoryExists && state.host.directoryExists(location.packageDirectory);
      return tryLoadModuleUsingPaths(
        {
          extensions: request.extensions,
          moduleName: location.rest,
          baseDirectory: location.packageDirectory,
          paths: versionPaths.paths,
          loader: specificLoader(location.packageInfo, location.rest),
          onlyRecordFailures: !packageDirectoryExists,
          fromFile: withoutPackageMetadata,
        },
        state,
      );
    }),
  );

export { loadFromDirectory, resolveVersionPathsWithTrace, specificLoader };
export type { PackageLocation, PackagePaths, SpecificRequest };
