import { Option, Predicate } from "effect";
import { ModuleKind } from "typescript/sync";

import { fileExtensionIsOneOf, getAnyExtensionFromPath } from "./extensions.ts";
import type { ModuleKindInfo, ModuleKindReason } from "./host-types.ts";
import { pathContainsNodeModules } from "./node-modules-paths.ts";
import { getPackageScopeForPath } from "./package-json.ts";
import { combinePaths, getDirectoryPath, getNormalizedAbsolutePath, toPath } from "./paths.ts";
import type {
  PackageJsonCache,
  PackageJsonInfo,
  ResolutionKind,
  ResolutionMode,
  ResolutionState,
  ResolverHost,
} from "./resolution-types.ts";
import { NO_FEATURES, createOutcome } from "./resolver-state.ts";
import { resolveNestedModule } from "./resolver.ts";

interface FileFormatSource {
  readonly host: ResolverHost;
  readonly kind: ResolutionKind;
  readonly packageJsonCache: PackageJsonCache;
}

interface FileFormats {
  readonly impliedFormat: (fileName: string) => Option.Option<ResolutionMode>;
  readonly moduleKind: (fileName: string) => Option.Option<ModuleKindInfo>;
  readonly packageJsonScopeFor: (fileName: string) => Option.Option<PackageJsonInfo>;
}

const ESM_EXTENSIONS = [".d.mts", ".mts", ".mjs"];
const CJS_EXTENSIONS = [".d.cts", ".cts", ".cjs"];
const EXPLICIT_FORMAT_EXTENSIONS = [...ESM_EXTENSIONS, ...CJS_EXTENSIONS];
const LOOKUP_EXTENSIONS = [".d.ts", ".ts", ".tsx", ".js", ".jsx"];
const MODULE_SYNTAX_EXTENSIONS: ReadonlySet<string> = new Set(EXPLICIT_FORMAT_EXTENSIONS);

const DETECTED_KINDS: Readonly<Record<ResolutionMode, number>> = {
  ESNext: ModuleKind.ESNext,
  CommonJS: ModuleKind.CommonJS,
};

const lookupState = (
  source: FileFormatSource,
  packageJsonCache: Option.Option<PackageJsonCache>,
): ResolutionState => ({
  host: source.host,
  trace: Option.none(),
  options: { moduleResolution: source.kind, noDtsResolution: false },
  cache: Option.none(),
  packageJsonCache,
  features: NO_FEATURES,
  conditions: [],
  candidateIsFromPackageJsonField: false,
  outcome: createOutcome(),
  resolveNested: resolveNestedModule,
});

const shouldLookupPackageJson = (kind: ResolutionKind, path: string): boolean =>
  (kind === "Node16" || pathContainsNodeModules(path)) &&
  fileExtensionIsOneOf(path, LOOKUP_EXTENSIONS);

const isModuleScope = (info: PackageJsonInfo): boolean =>
  info.contents.packageJsonContent["type"] === "module";

const formatOfScope = (scope: Option.Option<PackageJsonInfo>): ResolutionMode => {
  if (Option.exists(scope, isModuleScope)) {
    return "ESNext";
  }
  return "CommonJS";
};

const cachedScope = (source: FileFormatSource, path: string): Option.Option<PackageJsonInfo> =>
  getPackageScopeForPath(path, lookupState(source, Option.some(source.packageJsonCache)));

const impliedFormatOf = (
  source: FileFormatSource,
  fileName: string,
): Option.Option<ResolutionMode> => {
  const path = toPath(fileName);
  if (fileExtensionIsOneOf(path, ESM_EXTENSIONS)) {
    return Option.some("ESNext");
  }
  if (fileExtensionIsOneOf(path, CJS_EXTENSIONS)) {
    return Option.some("CommonJS");
  }
  if (!shouldLookupPackageJson(source.kind, path)) {
    return Option.none();
  }
  const scope = cachedScope(source, getDirectoryPath(path));
  return Option.some(formatOfScope(scope));
};

const scopeReason = (info: PackageJsonInfo): ModuleKindReason => {
  if (Predicate.isTruthy(info.contents.packageJsonContent["type"])) {
    return "type";
  }
  return "no:type";
};

const reasonFor = (
  source: FileFormatSource,
  fileName: string,
): Pick<ModuleKindInfo, "detectedReason" | "reasonFileName"> => {
  if (MODULE_SYNTAX_EXTENSIONS.has(getAnyExtensionFromPath(fileName))) {
    return { detectedReason: "extension", reasonFileName: fileName };
  }
  return Option.match(cachedScope(source, fileName), {
    onNone: () => ({ detectedReason: "no:type", reasonFileName: fileName }),
    onSome: (info) => ({
      detectedReason: scopeReason(info),
      reasonFileName: combinePaths(info.packageDirectory, "package.json"),
    }),
  });
};

const moduleKindOf = (source: FileFormatSource, fileName: string): Option.Option<ModuleKindInfo> =>
  impliedFormatOf(source, fileName).pipe(
    Option.map((format) => ({
      detectedKind: DETECTED_KINDS[format],
      ...reasonFor(source, fileName),
    })),
  );

const packageJsonScopeOf = (
  source: FileFormatSource,
  fileName: string,
): Option.Option<PackageJsonInfo> => {
  const path = getNormalizedAbsolutePath(fileName, "/");
  if (
    fileExtensionIsOneOf(path, EXPLICIT_FORMAT_EXTENSIONS) ||
    !shouldLookupPackageJson(source.kind, path)
  ) {
    return Option.none();
  }
  return getPackageScopeForPath(getDirectoryPath(path), lookupState(source, Option.none()));
};

const createFileFormats = (source: FileFormatSource): FileFormats => ({
  impliedFormat: (fileName) => impliedFormatOf(source, fileName),
  moduleKind: (fileName) => moduleKindOf(source, fileName),
  packageJsonScopeFor: (fileName) => packageJsonScopeOf(source, fileName),
});

export { createFileFormats };
export type { FileFormatSource, FileFormats };
