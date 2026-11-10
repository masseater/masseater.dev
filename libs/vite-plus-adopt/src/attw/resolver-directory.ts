import { Option } from "effect";

import { extensionsOf } from "./extensions.ts";
import type { Extensions } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { readPackageJsonMainField, readPackageJsonTypesFields } from "./package-json-fields.ts";
import { resolvePackageJsonInfo, withPackageId } from "./package-json.ts";
import { tryLoadModuleUsingPaths } from "./paths-mapping.ts";
import type { Loader } from "./paths-mapping.ts";
import {
  combinePaths,
  containsPath,
  getDirectoryPath,
  getRelativePathFromDirectory,
} from "./paths.ts";
import type {
  CandidateRequest,
  PackageJsonContent,
  PackageJsonInfo,
  PathAndExtension,
  Resolved,
  ResolutionState,
  VersionPaths,
} from "./resolution-types.ts";
import { loadFileNameFromPackageJsonField, loadModuleFromFile } from "./resolver-files.ts";
import { RESOLUTION_VERSION, getVersionPaths } from "./types-versions.ts";

interface RelativeRequest extends CandidateRequest {
  readonly considerPackageJson: boolean;
}

type RelativeLoader = (request: RelativeRequest, state: ResolutionState) => Option.Option<Resolved>;

interface PackageDirectoryContents {
  readonly jsonContent: Option.Option<PackageJsonContent>;
  readonly versionPaths: Option.Option<VersionPaths>;
}

interface DirectoryLoadRequest extends RelativeRequest {
  readonly loadRelative: RelativeLoader;
}

interface DirectoryWorkerRequest extends CandidateRequest, PackageDirectoryContents {
  readonly loadRelative: RelativeLoader;
}

interface PackageEntry {
  readonly packageFile: Option.Option<string>;
  readonly loader: Loader;
  readonly onlyRecordFailuresForPackageFile: boolean;
  readonly onlyRecordFailuresForIndex: boolean;
}

const DECLARATION_ONLY_SIZE = 1;
const INDEX = "index";

const expandDeclarationOnly = (extensions: Extensions): Extensions => {
  if (extensions.length === DECLARATION_ONLY_SIZE && extensions.includes("Declaration")) {
    return extensionsOf("TypeScript", "Declaration");
  }
  return extensions;
};

const packageFieldState = (
  state: ResolutionState,
  jsonContent: Option.Option<PackageJsonContent>,
): ResolutionState => ({
  ...state,
  candidateIsFromPackageJsonField: true,
  features: {
    ...state.features,
    esmMode:
      state.features.esmMode &&
      Option.exists(jsonContent, (content) => content["type"] === "module"),
  },
});

const packageFieldLoader =
  (jsonContent: Option.Option<PackageJsonContent>, loadRelative: RelativeLoader): Loader =>
  (request, state) =>
    loadFileNameFromPackageJsonField(request, state).pipe(
      Option.orElse(() =>
        loadRelative(
          {
            ...request,
            extensions: expandDeclarationOnly(request.extensions),
            considerPackageJson: false,
          },
          packageFieldState(state, jsonContent),
        ).pipe(
          Option.map(({ path, extension, resolvedUsingTsExtension }): PathAndExtension => ({
            path,
            extension,
            resolvedUsingTsExtension,
          })),
        ),
      ),
    );

const readPackageFile = (
  request: CandidateRequest,
  jsonContent: Option.Option<PackageJsonContent>,
  state: ResolutionState,
): Option.Option<string> =>
  jsonContent.pipe(
    Option.flatMap((content) =>
      Option.liftPredicate(request.extensions, (value) => value.includes("Declaration")).pipe(
        Option.flatMap(() => readPackageJsonTypesFields(content, request.candidate, state)),
        Option.orElse(() => readPackageJsonMainField(content, request.candidate, state)),
      ),
    ),
  );

const tryVersionPaths = (
  context: Readonly<{
    extensions: Extensions;
    candidate: string;
    packageFile: Option.Option<string>;
    versionPaths: VersionPaths;
    loader: Loader;
    onlyRecordFailures: boolean;
  }>,
  state: ResolutionState,
): Option.Option<Option.Option<PathAndExtension>> => {
  const moduleName = getRelativePathFromDirectory(
    context.candidate,
    Option.getOrElse(context.packageFile, () => combinePaths(context.candidate, INDEX)),
  );
  traceMessage(
    state,
    Messages.packageJsonTypesVersionsMatch,
    context.versionPaths.version,
    RESOLUTION_VERSION,
    moduleName,
  );
  return tryLoadModuleUsingPaths(
    {
      extensions: context.extensions,
      moduleName,
      baseDirectory: context.candidate,
      paths: context.versionPaths.paths,
      loader: context.loader,
      onlyRecordFailures: context.onlyRecordFailures,
      fromFile: (file) => file,
    },
    state,
  );
};

const packageEntryOf = (request: DirectoryWorkerRequest, state: ResolutionState): PackageEntry => {
  const packageFile = readPackageFile(request, request.jsonContent, state);
  return {
    packageFile,
    loader: packageFieldLoader(request.jsonContent, request.loadRelative),
    onlyRecordFailuresForPackageFile: Option.exists(
      packageFile,
      (file) => !state.host.directoryExists(getDirectoryPath(file)),
    ),
    onlyRecordFailuresForIndex:
      request.onlyRecordFailures || !state.host.directoryExists(request.candidate),
  };
};

const fromVersionPaths = (
  request: DirectoryWorkerRequest,
  entry: PackageEntry,
  state: ResolutionState,
): Option.Option<Option.Option<PathAndExtension>> =>
  request.versionPaths.pipe(
    Option.filter(() =>
      Option.match(entry.packageFile, {
        onNone: () => true,
        onSome: (file) => containsPath(request.candidate, file),
      }),
    ),
    Option.flatMap((paths) =>
      tryVersionPaths(
        {
          extensions: request.extensions,
          candidate: request.candidate,
          packageFile: entry.packageFile,
          versionPaths: paths,
          loader: entry.loader,
          onlyRecordFailures:
            entry.onlyRecordFailuresForPackageFile || entry.onlyRecordFailuresForIndex,
        },
        state,
      ),
    ),
  );

const fromIndexFile = (
  request: DirectoryWorkerRequest,
  entry: PackageEntry,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  if (state.features.esmMode) {
    return Option.none();
  }
  return loadModuleFromFile(
    {
      extensions: request.extensions,
      candidate: combinePaths(request.candidate, INDEX),
      onlyRecordFailures: entry.onlyRecordFailuresForIndex,
    },
    state,
  );
};

const fromPackageFileOrIndex = (
  request: DirectoryWorkerRequest,
  entry: PackageEntry,
  state: ResolutionState,
): Option.Option<PathAndExtension> =>
  entry.packageFile.pipe(
    Option.flatMap((file) =>
      entry.loader(
        {
          extensions: request.extensions,
          candidate: file,
          onlyRecordFailures: entry.onlyRecordFailuresForPackageFile,
        },
        state,
      ),
    ),
    Option.orElse(() => fromIndexFile(request, entry, state)),
  );

const loadNodeModuleFromDirectoryWorker = (
  request: DirectoryWorkerRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  const entry = packageEntryOf(request, state);
  return fromVersionPaths(request, entry, state).pipe(
    Option.getOrElse(() => fromPackageFileOrIndex(request, entry, state)),
  );
};

const loadNodeModuleFromDirectory = (
  request: DirectoryLoadRequest,
  state: ResolutionState,
): Option.Option<Resolved> => {
  const info = Option.liftPredicate(request.considerPackageJson, (consider) => consider).pipe(
    Option.flatMap(() =>
      resolvePackageJsonInfo(request.candidate, request.onlyRecordFailures, state),
    ),
  );
  const versionPaths = info.pipe(
    Option.flatMap((packageInfo) => getVersionPaths(packageInfo, state)),
  );
  const jsonContent = info.pipe(
    Option.map((packageInfo: PackageJsonInfo) => packageInfo.contents.packageJsonContent),
  );
  const found = loadNodeModuleFromDirectoryWorker({ ...request, jsonContent, versionPaths }, state);
  return withPackageId(info, found, state);
};

export { loadNodeModuleFromDirectory, loadNodeModuleFromDirectoryWorker };
export type {
  DirectoryLoadRequest,
  DirectoryWorkerRequest,
  PackageDirectoryContents,
  RelativeLoader,
  RelativeRequest,
};
