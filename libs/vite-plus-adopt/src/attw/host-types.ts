import type { Option } from "effect";
import type { SourceFile } from "typescript/ast";

import type { ModeOptions } from "./module-mode.ts";
import type { ModuleNameRequest, TypeReferenceLookup } from "./program-build.ts";
import type {
  PackageJsonInfo,
  ResolutionKind,
  ResolutionResult,
  ResolverHost,
} from "./resolution-types.ts";
import type { ResolvedTypeReference } from "./type-reference.ts";

interface PackageFileSystem {
  readonly fileExists: (path: string) => boolean;
  readonly directoryExists: (path: string) => boolean;
  readonly tryReadFile: (path: string) => string | undefined;
  readonly listFiles: () => readonly string[];
}

interface TsPackageId {
  readonly name: string;
  readonly subModuleName: string;
  readonly version: string;
  readonly peerDependencies: string | undefined;
}

interface TsResolvedModule {
  readonly resolvedFileName: string;
  readonly originalPath: string | undefined;
  readonly extension: string;
  readonly isExternalLibraryImport: boolean;
  readonly packageId: TsPackageId | undefined;
  readonly resolvedUsingTsExtension: boolean;
}

interface TsResolution {
  readonly resolvedModule: TsResolvedModule | undefined;
}

interface CachedResolution {
  readonly result: ResolutionResult;
  readonly resolution: TsResolution;
  readonly trace: readonly string[];
}

type ModuleKindReason = "extension" | "type" | "no:type";

interface ModuleKindInfo {
  readonly detectedKind: number;
  readonly detectedReason: ModuleKindReason;
  readonly reasonFileName: string;
}

interface HostWrapperCore {
  readonly kind: ResolutionKind;
  readonly modeOptions: ModeOptions;
  readonly resolverHost: ResolverHost;
  readonly compilerOptions: Readonly<Record<string, number | boolean>>;
  readonly getSourceFile: (fileName: string) => Option.Option<SourceFile>;
  readonly getSourceFileFromCache: (fileName: string) => Option.Option<SourceFile>;
  readonly getModuleKindForFile: (fileName: string) => Option.Option<ModuleKindInfo>;
  readonly resolve: (request: ModuleNameRequest) => CachedResolution;
  readonly getTrace: (request: ModuleNameRequest) => Option.Option<readonly string[]>;
  readonly packageJsonScopeFor: (fileName: string) => Option.Option<PackageJsonInfo>;
  readonly resolveTypeReference: (
    request: TypeReferenceLookup,
  ) => Option.Option<ResolvedTypeReference>;
}

const LIB_FILE_NAME = "/node_modules/typescript/lib/lib.d.ts";

export { LIB_FILE_NAME };
export type {
  CachedResolution,
  TsPackageId,
  HostWrapperCore,
  ModuleKindInfo,
  ModuleKindReason,
  PackageFileSystem,
  TsResolution,
  TsResolvedModule,
};
