import type { Option } from "effect";
import type { PackageId as TsPackageId } from "typescript/sync";

import type { Extensions } from "./extensions.ts";

export type ResolutionKind = "Node10" | "Node16" | "Bundler";

export type ResolutionMode = "CommonJS" | "ESNext";

export interface Features {
  readonly imports: boolean;
  readonly selfName: boolean;
  readonly exports: boolean;
  readonly patternTrailers: boolean;
  readonly esmMode: boolean;
}

export interface ResolverHost {
  readonly fileExists: (path: string) => boolean;
  readonly directoryExists: (path: string) => boolean;
  readonly readFile: (path: string) => Option.Option<string>;
}

export interface ResolverOptions {
  readonly moduleResolution: ResolutionKind;
  readonly noDtsResolution: boolean;
}

export type PackageId = Readonly<TsPackageId>;

export interface CandidateRequest {
  readonly extensions: Extensions;
  readonly candidate: string;
  readonly onlyRecordFailures: boolean;
}

export interface ModuleLookup {
  readonly extensions: Extensions;
  readonly moduleName: string;
  readonly directory: string;
}

export interface PathAndExtension {
  readonly path: string;
  readonly extension: string;
  readonly resolvedUsingTsExtension: boolean;
}

export interface Resolved extends PathAndExtension {
  readonly packageId: Option.Option<PackageId>;
  readonly originalPath: Option.Option<string>;
}

export interface ResolvedModule {
  readonly resolvedFileName: string;
  readonly originalPath: Option.Option<string>;
  readonly extension: string;
  readonly isExternalLibraryImport: boolean;
  readonly packageId: Option.Option<PackageId>;
  readonly resolvedUsingTsExtension: boolean;
}

export interface ResolutionResult {
  readonly resolvedModule: Option.Option<ResolvedModule>;
  readonly alternateResult: Option.Option<string>;
}

export type PackageJsonContent = Readonly<Record<string, unknown>>;

export interface VersionPaths {
  readonly version: string;
  readonly paths: Readonly<Record<string, unknown>>;
}

export interface PackageJsonContents {
  readonly packageJsonContent: PackageJsonContent;
  readonly versionPaths: (
    compute: () => Option.Option<VersionPaths>,
  ) => Option.Option<VersionPaths>;
  readonly peerDependencies: (compute: () => Option.Option<string>) => Option.Option<string>;
}

export interface PackageJsonInfo {
  readonly packageDirectory: string;
  readonly contents: PackageJsonContents;
}

export interface MissingPackageJson {
  readonly packageDirectory: string;
  readonly directoryExists: boolean;
}

export type PackageJsonCacheEntry =
  | { readonly kind: "found"; readonly info: PackageJsonInfo }
  | { readonly kind: "missing"; readonly missing: MissingPackageJson };

export interface PackageJsonCache {
  readonly get: (packageJsonPath: string) => Option.Option<PackageJsonCacheEntry>;
  readonly set: (packageJsonPath: string, entry: PackageJsonCacheEntry) => void;
}

export interface ResolutionCacheKey {
  readonly name: string;
  readonly mode: Option.Option<ResolutionMode>;
  readonly directory: string;
}

export interface ModuleResolutionCache {
  readonly packageJson: PackageJsonCache;
  readonly getFromDirectory: (key: ResolutionCacheKey) => Option.Option<ResolutionResult>;
  readonly setForDirectory: (key: ResolutionCacheKey, result: ResolutionResult) => void;
  readonly getFromNonRelative: (key: ResolutionCacheKey) => Option.Option<ResolutionResult>;
  readonly setForNonRelative: (key: ResolutionCacheKey, result: ResolutionResult) => void;
}

export interface Outcome {
  readonly markResolvedPackageDirectory: () => void;
  readonly resolvedPackageDirectory: () => boolean;
  readonly rememberResultFromCache: (result: ResolutionResult) => void;
  readonly resultFromCache: () => Option.Option<ResolutionResult>;
}

export interface NestedResolution {
  readonly moduleName: string;
  readonly containingDirectory: string;
  readonly extensions: Extensions;
}

export type TraceSink = (message: string) => void;

export interface ResolutionState {
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

export type SearchResult = Option.Option<Option.Option<Resolved>>;
