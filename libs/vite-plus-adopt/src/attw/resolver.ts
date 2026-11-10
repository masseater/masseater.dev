import { Option } from "effect";

import { extensionsOf } from "./extensions.ts";
import type { Extensions } from "./extensions.ts";
import { Messages, emitTrace, formatMessage, traceMessage } from "./messages.ts";
import { packageIdToString } from "./package-json.ts";
import { getDirectoryPath, isExternalModuleNameRelative } from "./paths.ts";
import type {
  Features,
  NestedResolution,
  ResolutionMode,
  ResolutionResult,
  ResolutionState,
  ResolvedModule,
  ResolverOptions,
  TraceSink,
} from "./resolution-types.ts";
import { resolveAlternateResultWithTrace, resolveWithPriority } from "./resolver-attempt.ts";
import type { Found } from "./resolver-attempt.ts";
import {
  ALL_FEATURES,
  NO_FEATURES,
  createState,
  getConditions,
  nestedContext,
  nestedRequest,
  workerMode,
} from "./resolver-state.ts";
import type { WorkerContext, WorkerRequest } from "./resolver-state.ts";

interface ResolveModuleNameRequest {
  readonly moduleName: string;
  readonly containingFile: string;
  readonly options: ResolverOptions;
  readonly mode: Option.Option<ResolutionMode>;
}

interface DirectoryRequest {
  readonly moduleName: string;
  readonly containingDirectory: string;
  readonly options: ResolverOptions;
  readonly mode: Option.Option<ResolutionMode>;
}

const supportsExportsAndImports = (request: WorkerRequest): boolean =>
  request.options.moduleResolution !== "Node10";

const modeLabel = (features: Features): string => {
  if (features.esmMode) {
    return "ESM";
  }
  return "CJS";
};

const announceMode = (request: WorkerRequest, state: ResolutionState): void => {
  if (!supportsExportsAndImports(request)) {
    return;
  }
  traceMessage(
    state,
    Messages.resolvingInMode,
    modeLabel(request.features),
    state.conditions.map((condition) => `'${condition}'`).join(", "),
  );
};

const toResolutionResult = (
  found: Option.Option<Found>,
  alternateResult: Option.Option<string>,
): ResolutionResult => ({
  resolvedModule: found.pipe(
    Option.map(({ resolved, isExternalLibraryImport }): ResolvedModule => ({
      resolvedFileName: resolved.path,
      originalPath: resolved.originalPath,
      extension: resolved.extension,
      isExternalLibraryImport,
      packageId: resolved.packageId,
      resolvedUsingTsExtension: resolved.resolvedUsingTsExtension,
    })),
  ),
  alternateResult,
});

const alternateResultOf = (
  request: WorkerRequest,
  result: Option.Option<Found>,
  state: ResolutionState,
): Option.Option<string> => {
  if (
    !state.outcome.resolvedPackageDirectory() ||
    isExternalModuleNameRelative(request.moduleName)
  ) {
    return Option.none();
  }
  return resolveAlternateResultWithTrace(request, result, state);
};

const nodeModuleNameResolverWorker = (
  request: WorkerRequest,
  context: WorkerContext,
): ResolutionResult => {
  const conditions = request.conditions.pipe(
    Option.getOrElse(() => getConditions(request.options, workerMode(request))),
  );
  const state: ResolutionState = {
    ...createState(request, context, conditions),
    resolveNested: (current, nested) =>
      nodeModuleNameResolverWorker(nestedRequest(current, nested), nestedContext(current)),
  };
  announceMode(request, state);
  const result = Option.flatten(resolveWithPriority(request, state));
  const alternateResult = alternateResultOf(request, result, state);
  return state.outcome
    .resultFromCache()
    .pipe(Option.getOrElse(() => toResolutionResult(result, alternateResult)));
};

const resolveNestedModule = (state: ResolutionState, nested: NestedResolution): ResolutionResult =>
  nodeModuleNameResolverWorker(nestedRequest(state, nested), nestedContext(state));

const extensionsFor = (options: ResolverOptions): Extensions => {
  if (options.noDtsResolution) {
    return extensionsOf("TypeScript", "JavaScript", "Json");
  }
  return extensionsOf("TypeScript", "JavaScript", "Declaration", "Json");
};

const featuresFor = (request: DirectoryRequest): Features => {
  if (request.options.moduleResolution === "Node16") {
    return { ...ALL_FEATURES, esmMode: Option.contains(request.mode, "ESNext") };
  }
  if (request.options.moduleResolution === "Bundler" || Option.isSome(request.mode)) {
    return ALL_FEATURES;
  }
  return NO_FEATURES;
};

const conditionsFor = (request: DirectoryRequest): Option.Option<readonly string[]> => {
  if (request.options.moduleResolution === "Node16") {
    return Option.none();
  }
  return request.mode.pipe(Option.map((mode) => getConditions(request.options, Option.some(mode))));
};

const resolveInDirectory = (request: DirectoryRequest, context: WorkerContext): ResolutionResult =>
  nodeModuleNameResolverWorker(
    {
      features: featuresFor(request),
      moduleName: request.moduleName,
      containingDirectory: request.containingDirectory,
      options: request.options,
      extensions: extensionsFor(request.options),
      conditions: conditionsFor(request),
    },
    context,
  );

const resolveUncached = (
  request: ResolveModuleNameRequest,
  context: WorkerContext,
): ResolutionResult => {
  const containingDirectory = getDirectoryPath(request.containingFile);
  traceMessage(context, Messages.explicitResolutionKind, request.options.moduleResolution);
  const result = resolveInDirectory({ ...request, containingDirectory }, context);
  const key = { name: request.moduleName, mode: request.mode, directory: containingDirectory };
  for (const cache of Option.toArray(context.cache)) {
    cache.setForDirectory(key, result);
    if (!isExternalModuleNameRelative(request.moduleName)) {
      cache.setForNonRelative(key, result);
    }
  }
  return result;
};

const resolvedMessage = (moduleName: string, module: ResolvedModule): string =>
  module.packageId.pipe(
    Option.match({
      onNone: () => formatMessage(Messages.moduleResolved, moduleName, module.resolvedFileName),
      onSome: (packageId) =>
        formatMessage(
          Messages.moduleResolvedWithPackageId,
          moduleName,
          module.resolvedFileName,
          packageIdToString(packageId),
        ),
    }),
  );

const traceOutcome = (
  moduleName: string,
  result: ResolutionResult,
  trace: Option.Option<TraceSink>,
): void => {
  const message = result.resolvedModule.pipe(
    Option.match({
      onNone: () => formatMessage(Messages.moduleNotResolved, moduleName),
      onSome: (module) => resolvedMessage(moduleName, module),
    }),
  );
  emitTrace(trace, message);
};

const reuseCachedWithTrace = (
  request: ResolveModuleNameRequest,
  context: WorkerContext,
): Option.Option<ResolutionResult> => {
  const directory = getDirectoryPath(request.containingFile);
  return context.cache.pipe(
    Option.flatMap((cache) =>
      cache.getFromDirectory({ name: request.moduleName, mode: request.mode, directory }),
    ),
    Option.map((cached) => {
      traceMessage(context, Messages.resolutionFoundInCache, request.moduleName, directory);
      return cached;
    }),
  );
};

const resolveModuleName = (
  request: ResolveModuleNameRequest,
  context: WorkerContext,
): ResolutionResult => {
  traceMessage(context, Messages.resolvingModule, request.moduleName, request.containingFile);
  const result = reuseCachedWithTrace(request, context).pipe(
    Option.getOrElse(() => resolveUncached(request, context)),
  );
  traceOutcome(request.moduleName, result, context.trace);
  return result;
};

export { resolveInDirectory, resolveModuleName, resolveNestedModule };
export type { DirectoryRequest, ResolveModuleNameRequest };
