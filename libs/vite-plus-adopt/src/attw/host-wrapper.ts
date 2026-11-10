import { Option } from "effect";
import { ModuleKind, ModuleResolutionKind } from "typescript/sync";

import { createFileFormats } from "./host-files.ts";
import { createResolutionStore } from "./host-resolutions.ts";
import { createSourceFileStore } from "./host-sources.ts";
import { LIB_FILE_NAME } from "./host-types.ts";
import type { HostWrapperCore, PackageFileSystem } from "./host-types.ts";
import type { ModeOptions } from "./module-mode.ts";
import { createModuleResolutionCache } from "./resolution-cache.ts";
import type { ResolutionKind, ResolverHost } from "./resolution-types.ts";
import { resolveTypeReferenceDirective } from "./type-reference.ts";

interface HostSource {
  readonly fs: PackageFileSystem;
  readonly kind: ResolutionKind;
  readonly minimalLib: string;
}

const TARGET_LATEST = 99;

const MODULE_KINDS: Readonly<Record<ResolutionKind, number>> = {
  Node10: ModuleKind.CommonJS,
  Node16: ModuleKind.Node16,
  Bundler: ModuleKind.ESNext,
};

const RESOLUTION_KINDS: Readonly<Record<ResolutionKind, number>> = {
  Node10: ModuleResolutionKind.Node10,
  Node16: ModuleResolutionKind.Node16,
  Bundler: ModuleResolutionKind.Bundler,
};

const MODE_MODULES: Readonly<Record<ResolutionKind, ModeOptions["module"]>> = {
  Node10: "CommonJS",
  Node16: "Node16",
  Bundler: "ESNext",
};

const resolverHostOf = (fs: PackageFileSystem): ResolverHost => ({
  fileExists: fs.fileExists.bind(fs),
  directoryExists: fs.directoryExists.bind(fs),
  readFile: (path) => Option.fromNullishOr(fs.tryReadFile(path)),
});

const fileReader =
  (source: HostSource) =>
  (fileName: string): Option.Option<string> => {
    if (fileName === LIB_FILE_NAME) {
      return Option.some(source.minimalLib);
    }
    return Option.fromNullishOr(source.fs.tryReadFile(fileName));
  };

const compilerOptionsFor = (kind: ResolutionKind): HostWrapperCore["compilerOptions"] => ({
  moduleResolution: RESOLUTION_KINDS[kind],
  module: MODULE_KINDS[kind],
  target: TARGET_LATEST,
  resolveJsonModule: true,
  traceResolution: true,
});

const createHostWrapper = (source: HostSource): HostWrapperCore => {
  const { kind } = source;
  const resolverHost = resolverHostOf(source.fs);
  const normalCache = createModuleResolutionCache();
  const formats = createFileFormats({
    host: resolverHost,
    kind,
    packageJsonCache: normalCache.packageJson,
  });
  const sources = createSourceFileStore({
    read: fileReader(source),
    impliedFormat: formats.impliedFormat,
  });
  const resolutions = createResolutionStore({ host: resolverHost, kind, normalCache });
  return {
    kind,
    modeOptions: { moduleResolution: kind, module: MODE_MODULES[kind] },
    resolverHost,
    compilerOptions: compilerOptionsFor(kind),
    getSourceFile: sources.open,
    getSourceFileFromCache: sources.cached,
    getModuleKindForFile: formats.moduleKind,
    resolve: resolutions.resolve,
    getTrace: resolutions.getTrace,
    packageJsonScopeFor: formats.packageJsonScopeFor,
    resolveTypeReference: ({ name, containingFile, mode }) =>
      resolveTypeReferenceDirective(
        { name, containingFile, options: { moduleResolution: kind, noDtsResolution: false }, mode },
        resolverHost,
      ),
  };
};

export { createHostWrapper };
export type { HostSource };
