import { MutableRef, Option } from "effect";

import type { Extensions } from "./extensions.ts";
import {
  combinePaths,
  ensureTrailingDirectorySeparator,
  getPathComponents,
  normalizePath,
} from "./paths.ts";
import type {
  Features,
  ModuleResolutionCache,
  NestedResolution,
  Outcome,
  ResolutionMode,
  ResolutionResult,
  ResolutionState,
  ResolverHost,
  ResolverOptions,
  TraceSink,
} from "./resolution-types.ts";

interface WorkerRequest {
  readonly features: Features;
  readonly moduleName: string;
  readonly containingDirectory: string;
  readonly options: ResolverOptions;
  readonly extensions: Extensions;
  readonly conditions: Option.Option<readonly string[]>;
}

interface WorkerContext {
  readonly host: ResolverHost;
  readonly trace: Option.Option<TraceSink>;
  readonly cache: Option.Option<ModuleResolutionCache>;
}

type OptionalCondition = readonly [string, (options: ResolverOptions) => boolean];

const LAST = -1;

const NO_FEATURES: Features = {
  imports: false,
  selfName: false,
  exports: false,
  patternTrailers: false,
  esmMode: false,
};

const ALL_FEATURES: Features = {
  imports: true,
  selfName: true,
  exports: true,
  patternTrailers: true,
  esmMode: false,
};

const OPTIONAL_CONDITIONS: readonly OptionalCondition[] = [
  ["types", (options) => !options.noDtsResolution],
  ["node", (options) => options.moduleResolution !== "Bundler"],
];

const createOutcome = (): Outcome => {
  const packageDirectory = MutableRef.make(false);
  const cached = MutableRef.make(Option.none<ResolutionResult>());
  return {
    markResolvedPackageDirectory: () => {
      MutableRef.set(packageDirectory, true);
    },
    resolvedPackageDirectory: () => MutableRef.get(packageDirectory),
    rememberResultFromCache: (result) => {
      MutableRef.set(cached, Option.some(result));
    },
    resultFromCache: () => MutableRef.get(cached),
  };
};

const moduleCondition = (esm: boolean): string => {
  if (esm) {
    return "import";
  }
  return "require";
};

const isUnconditional = (options: ResolverOptions, mode: Option.Option<ResolutionMode>): boolean =>
  Option.isNone(mode) && options.moduleResolution === "Node10";

const usesImportCondition = (
  options: ResolverOptions,
  mode: Option.Option<ResolutionMode>,
): boolean =>
  mode.pipe(
    Option.map((kind) => kind === "ESNext"),
    Option.getOrElse(() => options.moduleResolution === "Bundler"),
  );

const getConditions = (
  options: ResolverOptions,
  mode: Option.Option<ResolutionMode>,
): readonly string[] => {
  if (isUnconditional(options, mode)) {
    return [];
  }
  const optional = OPTIONAL_CONDITIONS.filter(([, applies]) => applies(options)).map(
    ([name]) => name,
  );
  return [moduleCondition(usesImportCondition(options, mode)), ...optional];
};

const normalizePathForCJSResolution = (
  containingDirectory: string,
  moduleName: string,
): { readonly path: string; readonly parts: readonly string[] } => {
  const combined = combinePaths(containingDirectory, moduleName);
  const parts = getPathComponents(combined);
  const last = parts.at(LAST) ?? "";
  const normalized = normalizePath(combined);
  if (last === "." || last === "..") {
    return { path: ensureTrailingDirectorySeparator(normalized), parts };
  }
  return { path: normalized, parts };
};

const workerMode = (request: WorkerRequest): Option.Option<ResolutionMode> => {
  if (request.options.moduleResolution !== "Node16") {
    return Option.none();
  }
  if (request.features.esmMode) {
    return Option.some("ESNext");
  }
  return Option.some("CommonJS");
};

const nestedRequest = (state: ResolutionState, nested: NestedResolution): WorkerRequest => ({
  features: state.features,
  moduleName: nested.moduleName,
  containingDirectory: nested.containingDirectory,
  options: state.options,
  extensions: nested.extensions,
  conditions: Option.some(state.conditions),
});

const nestedContext = (state: ResolutionState): WorkerContext => ({
  host: state.host,
  trace: state.trace,
  cache: state.cache,
});

const createState = (
  request: WorkerRequest,
  context: WorkerContext,
  conditions: readonly string[],
): Omit<ResolutionState, "resolveNested"> => ({
  host: context.host,
  trace: context.trace,
  options: request.options,
  cache: context.cache,
  packageJsonCache: context.cache.pipe(Option.map((cache) => cache.packageJson)),
  features: request.features,
  conditions,
  candidateIsFromPackageJsonField: false,
  outcome: createOutcome(),
});

export {
  ALL_FEATURES,
  NO_FEATURES,
  createOutcome,
  createState,
  getConditions,
  nestedContext,
  nestedRequest,
  normalizePathForCJSResolution,
  workerMode,
};
export type { WorkerContext, WorkerRequest };
