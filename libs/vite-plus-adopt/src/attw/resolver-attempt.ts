import { Option } from "effect";

import {
  PRIORITY_KINDS,
  extensionIsOk,
  formatExtensions,
  intersectExtensions,
  subtractExtensions,
} from "./extensions.ts";
import type { Extensions } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { isExternalModuleNameRelative } from "./paths.ts";
import type {
  Features,
  ModuleLookup,
  Resolved,
  ResolutionState,
  ResolverOptions,
  SearchResult,
} from "./resolution-types.ts";
import {
  loadModuleFromSelfNameReference,
  resolvePackageImportWithTrace,
} from "./resolver-exports.ts";
import { loadModuleFromNearestNodeModulesDirectory } from "./resolver-node-modules.ts";
import { loadRelativeModule } from "./resolver-relative.ts";
import { ALL_FEATURES, createOutcome, getConditions } from "./resolver-state.ts";
import type { WorkerRequest } from "./resolver-state.ts";

interface Found {
  readonly resolved: Resolved;
  readonly isExternalLibraryImport: boolean;
}

type FoundResult = Option.Option<Option.Option<Found>>;

const EMPTY = 0;

const resolveFromNodeModulesWithTrace = (
  lookup: ModuleLookup,
  state: ResolutionState,
): SearchResult => {
  const extensions = formatExtensions(lookup.extensions);
  if (lookup.moduleName.includes(":")) {
    traceMessage(state, Messages.skippingAbsoluteUri, lookup.moduleName, extensions);
    return Option.none();
  }
  traceMessage(state, Messages.loadingFromNodeModules, lookup.moduleName, extensions);
  return loadModuleFromNearestNodeModulesDirectory({ ...lookup, typesScopeOnly: false }, state);
};

const fromPackageImports = (
  lookup: ModuleLookup,
  features: Features,
  state: ResolutionState,
): SearchResult => {
  if (features.imports && lookup.moduleName.startsWith("#")) {
    return resolvePackageImportWithTrace(lookup, state);
  }
  return Option.none();
};

const fromSelfName = (
  lookup: ModuleLookup,
  features: Features,
  state: ResolutionState,
): SearchResult => {
  if (features.selfName) {
    return loadModuleFromSelfNameReference(lookup, state);
  }
  return Option.none();
};

const resolveNonRelative = (
  lookup: ModuleLookup,
  features: Features,
  state: ResolutionState,
): FoundResult =>
  fromPackageImports(lookup, features, state).pipe(
    Option.orElse(() => fromSelfName(lookup, features, state)),
    Option.orElse(() => resolveFromNodeModulesWithTrace(lookup, state)),
    Option.map(Option.map((resolved): Found => ({ resolved, isExternalLibraryImport: true }))),
  );

const resolveRelative = (lookup: ModuleLookup, state: ResolutionState): Option.Option<Found> => {
  const { resolved, insideNodeModules } = loadRelativeModule(lookup, state);
  return resolved.pipe(
    Option.map((value) => ({ resolved: value, isExternalLibraryImport: insideNodeModules })),
  );
};

const tryResolve = (
  extensions: Extensions,
  request: WorkerRequest,
  state: ResolutionState,
): FoundResult => {
  const lookup: ModuleLookup = {
    extensions,
    moduleName: request.moduleName,
    directory: request.containingDirectory,
  };
  if (!isExternalModuleNameRelative(request.moduleName)) {
    return resolveNonRelative(lookup, request.features, state);
  }
  return resolveRelative(lookup, state).pipe(Option.map((found) => Option.some(found)));
};

const tryNonEmpty = (
  extensions: Extensions,
  request: WorkerRequest,
  state: ResolutionState,
): FoundResult => {
  if (extensions.length === EMPTY) {
    return Option.none();
  }
  return tryResolve(extensions, request, state);
};

const resolveWithPriority = (request: WorkerRequest, state: ResolutionState): FoundResult => {
  if (request.options.moduleResolution !== "Node10") {
    return tryResolve(request.extensions, request, state);
  }
  return tryNonEmpty(intersectExtensions(request.extensions, PRIORITY_KINDS), request, state).pipe(
    Option.orElse(() =>
      tryNonEmpty(subtractExtensions(request.extensions, PRIORITY_KINDS), request, state),
    ),
  );
};

const diagnosticPath = (request: WorkerRequest, state: ResolutionState): Option.Option<string> =>
  tryResolve(intersectExtensions(request.extensions, PRIORITY_KINDS), request, state).pipe(
    Option.flatten,
    Option.filter((found) => found.isExternalLibraryImport),
    Option.map((found) => found.resolved.path),
  );

const wantedTypesButGotJs = (request: WorkerRequest, result: Option.Option<Found>): boolean => {
  const wantsTypes =
    request.extensions.includes("TypeScript") || request.extensions.includes("Declaration");
  return Option.exists(
    result,
    (found) => wantsTypes && !extensionIsOk(PRIORITY_KINDS, found.resolved.extension),
  );
};

const shouldRetryWithoutExports = (
  request: WorkerRequest,
  result: Option.Option<Found>,
  state: ResolutionState,
): boolean =>
  Option.exists(result, (found) => found.isExternalLibraryImport) &&
  wantedTypesButGotJs(request, result) &&
  request.features.exports &&
  state.conditions.includes("import");

const shouldRetryWithBundler = (request: WorkerRequest, result: Option.Option<Found>): boolean =>
  (Option.isNone(result) || wantedTypesButGotJs(request, result)) &&
  request.options.moduleResolution === "Node10";

const retryWithBundler = (
  request: WorkerRequest,
  state: ResolutionState,
): Option.Option<string> => {
  traceMessage(state, Messages.retryWithBundler);
  const options: ResolverOptions = { ...request.options, moduleResolution: "Bundler" };
  return diagnosticPath(request, {
    ...state,
    options,
    features: ALL_FEATURES,
    conditions: getConditions(options, Option.none()),
    outcome: createOutcome(),
  });
};

const resolveAlternateResultWithTrace = (
  request: WorkerRequest,
  result: Option.Option<Found>,
  state: ResolutionState,
): Option.Option<string> => {
  if (shouldRetryWithoutExports(request, result, state)) {
    traceMessage(state, Messages.retryWithoutModernFeatures);
    return diagnosticPath(request, {
      ...state,
      features: { ...state.features, exports: false },
      outcome: createOutcome(),
    });
  }
  if (shouldRetryWithBundler(request, result)) {
    return retryWithBundler(request, state);
  }
  return Option.none();
};

export { resolveAlternateResultWithTrace, resolveWithPriority };
export type { Found, FoundResult };
