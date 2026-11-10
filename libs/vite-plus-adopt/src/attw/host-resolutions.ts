import { MutableRef, Option, String as Str } from "effect";

import type { CachedResolution, TsPackageId, TsResolution } from "./host-types.ts";
import type { ModuleNameRequest } from "./program-build.ts";
import { createModuleResolutionCache } from "./resolution-cache.ts";
import { modeToNumber } from "./resolution-mode-numbers.ts";
import type {
  ModuleResolutionCache,
  PackageId,
  ResolutionKind,
  ResolutionMode,
  ResolutionResult,
  ResolverHost,
  TraceSink,
} from "./resolution-types.ts";
import { resolveModuleName } from "./resolver.ts";

interface ResolutionSource {
  readonly host: ResolverHost;
  readonly kind: ResolutionKind;
  readonly normalCache: ModuleResolutionCache;
}

interface ResolutionStore {
  readonly resolve: (request: ModuleNameRequest) => CachedResolution;
  readonly getTrace: (request: ModuleNameRequest) => Option.Option<readonly string[]>;
}

const DEFAULT_MODE = 1;
const ALLOW_JS_FLAG = 0;

const modeNumber = (mode: Option.Option<ResolutionMode>): number =>
  mode.pipe(
    Option.map((value) => modeToNumber(value)),
    Option.getOrElse(() => DEFAULT_MODE),
  );

const resolutionKey = (request: ModuleNameRequest): string =>
  `${String(modeNumber(request.mode))}:${String(Number(request.noDtsResolution))}:${String(ALLOW_JS_FLAG)}:${request.moduleName}`;

const toTsPackageId = (packageId: PackageId): TsPackageId => ({
  name: packageId.name,
  subModuleName: packageId.subModuleName,
  version: packageId.version,
  peerDependencies: Option.getOrUndefined(
    Option.liftPredicate(packageId.peerDependencies, Str.isNonEmpty),
  ),
});

const toTsResolution = (result: ResolutionResult): TsResolution => ({
  resolvedModule: result.resolvedModule.pipe(
    Option.map((module) => ({
      resolvedFileName: module.resolvedFileName,
      originalPath: Option.getOrUndefined(module.originalPath),
      extension: module.extension,
      isExternalLibraryImport: module.isExternalLibraryImport,
      packageId: module.packageId.pipe(Option.map(toTsPackageId), Option.getOrUndefined),
      resolvedUsingTsExtension: module.resolvedUsingTsExtension,
    })),
    Option.getOrUndefined,
  ),
});

const resolveWithTrace = (
  source: ResolutionSource,
  request: ModuleNameRequest,
  cache: ModuleResolutionCache,
): CachedResolution => {
  const lines = MutableRef.make<readonly string[]>([]);
  const sink: TraceSink = (message) => {
    MutableRef.update(lines, (current) => [...current, message]);
  };
  const { moduleName, containingFile, mode, noDtsResolution } = request;
  const result = resolveModuleName(
    {
      moduleName,
      containingFile,
      options: { moduleResolution: source.kind, noDtsResolution },
      mode,
    },
    {
      host: source.host,
      trace: Option.some(sink),
      cache: Option.some(cache),
    },
  );
  return { result, resolution: toTsResolution(result), trace: MutableRef.get(lines) };
};

const createResolutionStore = (source: ResolutionSource): ResolutionStore => {
  const noDtsCache = createModuleResolutionCache();
  const byFile = new Map<string, Map<string, CachedResolution>>();
  const tableFor = (containingFile: string): Map<string, CachedResolution> => {
    const table = byFile.get(containingFile) ?? new Map<string, CachedResolution>();
    byFile.set(containingFile, table);
    return table;
  };
  const cacheFor = (request: ModuleNameRequest): ModuleResolutionCache => {
    if (request.noDtsResolution) {
      return noDtsCache;
    }
    return source.normalCache;
  };
  const lookup = (request: ModuleNameRequest): Option.Option<CachedResolution> =>
    Option.fromNullishOr(byFile.get(request.containingFile)).pipe(
      Option.flatMap((table) => Option.fromNullishOr(table.get(resolutionKey(request)))),
    );
  return {
    resolve: (request) =>
      Option.getOrElse(lookup(request), () => {
        const entry = resolveWithTrace(source, request, cacheFor(request));
        tableFor(request.containingFile).set(resolutionKey(request), entry);
        return entry;
      }),
    getTrace: (request) => lookup(request).pipe(Option.map((entry) => entry.trace)),
  };
};

export { createResolutionStore, toTsResolution };
export type { ResolutionSource, ResolutionStore };
