import type { Option } from "effect";

import type { Extensions } from "./extensions.ts";

type ResolutionKind = "Node10" | "Node16" | "Bundler";

type ResolutionMode = "CommonJS" | "ESNext";

interface Features {
  readonly imports: boolean;
  readonly selfName: boolean;
  readonly exports: boolean;
  readonly patternTrailers: boolean;
  readonly esmMode: boolean;
}

interface ResolverHost {
  readonly fileExists: (path: string) => boolean;
  readonly directoryExists: (path: string) => boolean;
  readonly readFile: (path: string) => Option.Option<string>;
}

interface ResolverOptions {
  readonly moduleResolution: ResolutionKind;
  readonly noDtsResolution: boolean;
}

interface PackageId {
  readonly name: string;
  readonly subModuleName: string;
  readonly version: string;
  readonly peerDependencies: string;
}

interface CandidateRequest {
  readonly extensions: Extensions;
  readonly candidate: string;
  readonly onlyRecordFailures: boolean;
}

interface ModuleLookup {
  readonly extensions: Extensions;
  readonly moduleName: string;
  readonly directory: string;
}

interface PathAndExtension {
  readonly path: string;
  readonly extension: string;
  readonly resolvedUsingTsExtension: boolean;
}

interface Resolved extends PathAndExtension {
  readonly packageId: Option.Option<PackageId>;
  readonly originalPath: Option.Option<string>;
}

interface ResolvedModule {
  readonly resolvedFileName: string;
  readonly originalPath: Option.Option<string>;
  readonly extension: string;
  readonly isExternalLibraryImport: boolean;
  readonly packageId: Option.Option<PackageId>;
  readonly resolvedUsingTsExtension: boolean;
}

interface ResolutionResult {
  readonly resolvedModule: Option.Option<ResolvedModule>;
  readonly alternateResult: Option.Option<string>;
}

type PackageJsonContent = Readonly<Record<string, unknown>>;

interface VersionPaths {
  readonly version: string;
  readonly paths: Readonly<Record<string, unknown>>;
}

interface PackageJsonContents {
  readonly packageJsonContent: PackageJsonContent;
  readonly versionPaths: (
    compute: () => Option.Option<VersionPaths>,
  ) => Option.Option<VersionPaths>;
  readonly peerDependencies: (compute: () => Option.Option<string>) => Option.Option<string>;
}

interface PackageJsonInfo {
  readonly packageDirectory: string;
  readonly contents: PackageJsonContents;
}

interface MissingPackageJson {
  readonly packageDirectory: string;
  readonly directoryExists: boolean;
}

type PackageJsonCacheEntry =
  | { readonly kind: "found"; readonly info: PackageJsonInfo }
  | { readonly kind: "missing"; readonly missing: MissingPackageJson };

interface PackageJsonCache {
  readonly get: (packageJsonPath: string) => Option.Option<PackageJsonCacheEntry>;
  readonly set: (packageJsonPath: string, entry: PackageJsonCacheEntry) => void;
}

interface ResolutionCacheKey {
  readonly name: string;
  readonly mode: Option.Option<ResolutionMode>;
  readonly directory: string;
}

interface ModuleResolutionCache {
  readonly packageJson: PackageJsonCache;
  readonly getFromDirectory: (key: ResolutionCacheKey) => Option.Option<ResolutionResult>;
  readonly setForDirectory: (key: ResolutionCacheKey, result: ResolutionResult) => void;
  readonly getFromNonRelative: (key: ResolutionCacheKey) => Option.Option<ResolutionResult>;
  readonly setForNonRelative: (key: ResolutionCacheKey, result: ResolutionResult) => void;
}

interface Outcome {
  readonly markResolvedPackageDirectory: () => void;
  readonly resolvedPackageDirectory: () => boolean;
  readonly rememberResultFromCache: (result: ResolutionResult) => void;
  readonly resultFromCache: () => Option.Option<ResolutionResult>;
}

interface NestedResolution {
  readonly moduleName: string;
  readonly containingDirectory: string;
  readonly extensions: Extensions;
}

type TraceSink = (message: string) => void;

interface ResolutionState {
  readonly host: ResolverHost;
  readonly trace: Option.Option<TraceSink>;
  readonly options: ResolverOptions;
  readonly cache: Option.Option<ModuleResolutionCache>;
  readonly packageJsonCache: Option.Option<PackageJsonCache>;
  readonly features: Features;
  readonly conditions: readonly string[];
  readonly candidateIsFromPackageJsonField: boolean;
  readonly outcome: Outcome;
  readonly resolveNested: (state: ResolutionState, request: NestedResolution) => ResolutionResult;
}

type SearchResult = Option.Option<Option.Option<Resolved>>;

export type {
  CandidateRequest,
  Features,
  MissingPackageJson,
  ModuleLookup,
  ModuleResolutionCache,
  NestedResolution,
  Outcome,
  PackageId,
  PackageJsonCache,
  PackageJsonCacheEntry,
  PackageJsonContent,
  PackageJsonContents,
  PackageJsonInfo,
  PathAndExtension,
  ResolutionCacheKey,
  ResolutionKind,
  ResolutionMode,
  ResolutionResult,
  ResolutionState,
  Resolved,
  ResolvedModule,
  ResolverHost,
  ResolverOptions,
  SearchResult,
  TraceSink,
  VersionPaths,
};
