import { MutableRef, Option, Array as Arr, pipe, Function as Fn } from "effect";

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

const DATA_FIRST_ARITY = 2;
const DATA_FIRST_ARITY_3 = 3;

export interface WorkerRequest {
  readonly features: Features;
  readonly moduleName: string;
  readonly containingDirectory: string;
  readonly options: ResolverOptions;
  readonly extensions: Extensions;
  readonly conditions: Option.Option<readonly string[]>;
}

export interface WorkerContext {
  readonly host: ResolverHost;
  readonly trace: Option.Option<TraceSink>;
  readonly cache: Option.Option<ModuleResolutionCache>;
}

type OptionalCondition = readonly [string, (options: ResolverOptions) => boolean];

const LAST = -1;

export const NO_FEATURES: Features = {
  imports: false,
  selfName: false,
  exports: false,
  patternTrailers: false,
  esmMode: false,
};

export const ALL_FEATURES: Features = {
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

export const createOutcome = (): Outcome => {
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

export const getConditions: {
  (mode: Option.Option<ResolutionMode>): (options: ResolverOptions) => readonly string[];
  (options: ResolverOptions, mode: Option.Option<ResolutionMode>): readonly string[];
} = Fn.dual(
  DATA_FIRST_ARITY,
  (options: ResolverOptions, mode: Option.Option<ResolutionMode>): readonly string[] => {
    if (isUnconditional(options, mode)) {
      return [];
    }
    const optional = pipe(
      OPTIONAL_CONDITIONS,
      Arr.filter(([, applies]) => applies(options)),
      Arr.map(([name]) => name),
    );
    return [moduleCondition(usesImportCondition(options, mode)), ...optional];
  },
);

export const normalizePathForCJSResolution: {
  (
    moduleName: string,
  ): (containingDirectory: string) => { readonly path: string; readonly parts: readonly string[] };
  (
    containingDirectory: string,
    moduleName: string,
  ): { readonly path: string; readonly parts: readonly string[] };
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
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
  },
);

export const workerMode = (request: WorkerRequest): Option.Option<ResolutionMode> => {
  if (request.options.moduleResolution !== "Node16") {
    return Option.none();
  }
  if (request.features.esmMode) {
    return Option.some("ESNext");
  }
  return Option.some("CommonJS");
};

export const nestedRequest: {
  (nested: NestedResolution): (state: ResolutionState) => WorkerRequest;
  (state: ResolutionState, nested: NestedResolution): WorkerRequest;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (state: ResolutionState, nested: NestedResolution): WorkerRequest => ({
    features: state.features,
    moduleName: nested.moduleName,
    containingDirectory: nested.containingDirectory,
    options: state.options,
    extensions: nested.extensions,
    conditions: Option.some(state.conditions),
  }),
);

export const nestedContext = (state: ResolutionState): WorkerContext => ({
  host: state.host,
  trace: state.trace,
  cache: state.cache,
});

export const createState: {
  (
    context: WorkerContext,
    conditions: readonly string[],
  ): (request: WorkerRequest) => Omit<ResolutionState, "resolveNested">;
  (
    request: WorkerRequest,
    context: WorkerContext,
    conditions: readonly string[],
  ): Omit<ResolutionState, "resolveNested">;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
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
  }),
);
