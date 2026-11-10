import { Option } from "effect";

import { formatExtensions } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { parseNodeModuleFromPath } from "./node-modules-paths.ts";
import { resolvePackageJsonInfo, withPackageId } from "./package-json.ts";
import { getDirectoryPath, hasTrailingDirectorySeparator } from "./paths.ts";
import type {
  ModuleLookup,
  PackageJsonInfo,
  PathAndExtension,
  Resolved,
  ResolutionState,
} from "./resolution-types.ts";
import { loadNodeModuleFromDirectory } from "./resolver-directory.ts";
import type { RelativeLoader, RelativeRequest } from "./resolver-directory.ts";
import { loadModuleFromFile } from "./resolver-files.ts";
import { normalizePathForCJSResolution } from "./resolver-state.ts";

interface RelativeModule {
  readonly resolved: Option.Option<Resolved>;
  readonly insideNodeModules: boolean;
}

interface FileAttempt {
  readonly found: Option.Option<Resolved>;
  readonly onlyRecordFailures: boolean;
}

const directoryMissing = (directory: string, state: ResolutionState): boolean => {
  if (state.host.directoryExists(directory)) {
    return false;
  }
  traceMessage(state, Messages.directoryDoesNotExist, directory);
  return true;
};

const packageInfoOfFile = (
  request: RelativeRequest,
  resolved: PathAndExtension,
  state: ResolutionState,
): Option.Option<PackageJsonInfo> =>
  Option.liftPredicate(request.considerPackageJson, (consider) => consider).pipe(
    Option.flatMap(() => parseNodeModuleFromPath(resolved.path)),
    Option.flatMap((packageDirectory) => resolvePackageJsonInfo(packageDirectory, false, state)),
  );

const loadAsFile = (request: RelativeRequest, state: ResolutionState): Option.Option<Resolved> =>
  loadModuleFromFile(request, state).pipe(
    Option.flatMap((resolved) =>
      withPackageId(packageInfoOfFile(request, resolved, state), Option.some(resolved), state),
    ),
  );

const fileAttempt = (request: RelativeRequest, state: ResolutionState): FileAttempt => {
  if (hasTrailingDirectorySeparator(request.candidate)) {
    return { found: Option.none(), onlyRecordFailures: request.onlyRecordFailures };
  }
  const onlyRecordFailures =
    request.onlyRecordFailures || directoryMissing(getDirectoryPath(request.candidate), state);
  return { found: loadAsFile({ ...request, onlyRecordFailures }, state), onlyRecordFailures };
};

const nodeLoadModuleByRelativeName: RelativeLoader = (request, state) => {
  traceMessage(
    state,
    Messages.loadingAsFileOrFolder,
    request.candidate,
    formatExtensions(request.extensions),
  );
  const attempt = fileAttempt(request, state);
  if (Option.isSome(attempt.found)) {
    return attempt.found;
  }
  const onlyRecordFailures =
    attempt.onlyRecordFailures || directoryMissing(request.candidate, state);
  if (state.features.esmMode) {
    return Option.none();
  }
  return loadNodeModuleFromDirectory(
    { ...request, onlyRecordFailures, loadRelative: nodeLoadModuleByRelativeName },
    state,
  );
};

const loadRelativeModule = (lookup: ModuleLookup, state: ResolutionState): RelativeModule => {
  const { path, parts } = normalizePathForCJSResolution(lookup.directory, lookup.moduleName);
  const resolved = nodeLoadModuleByRelativeName(
    {
      extensions: lookup.extensions,
      candidate: path,
      onlyRecordFailures: false,
      considerPackageJson: true,
    },
    state,
  );
  return { resolved, insideNodeModules: parts.includes("node_modules") };
};

export { directoryMissing, loadRelativeModule, nodeLoadModuleByRelativeName };
export type { RelativeModule };
