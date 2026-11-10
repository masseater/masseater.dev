import { Array as Arr, Option } from "effect";
import type { SourceFile } from "typescript/ast";

import { fileExtensionIsOneOf } from "./extensions.ts";
import { getDefaultResolutionModeForFile } from "./module-mode.ts";
import { combinePaths, getBaseFileName, getDirectoryPath, normalizePath } from "./paths.ts";
import { createProgramBuild } from "./program-build.ts";
import type {
  FileRequest,
  IncludeSourceFile,
  ProgramBuild,
  ProgramFiles,
  ProgramHost,
  ProgramOptions,
} from "./program-build.ts";
import { processImportedModules } from "./program-imports.ts";
import { modeFromNumber } from "./resolution-mode-numbers.ts";
import { setPackageJsonScope } from "./source-file.ts";

interface ReferenceWalk {
  readonly build: ProgramBuild;
  readonly include: IncludeSourceFile;
  readonly sourceFile: SourceFile;
  readonly isDefaultLib: boolean;
}

const TS_EXTENSIONS = [".ts", ".tsx", ".d.ts", ".cts", ".d.cts", ".mts", ".d.mts"];
const JS_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs"];
const IMPLICIT_EXTENSIONS = [".ts", ".tsx", ".d.ts"];
const OUTSIDE_NODE_MODULES = 0;
const NO_ROOTS = 0;
const MAX_NODE_MODULE_JS_DEPTH = 0;

const supportedExtensions = (options: ProgramOptions): readonly string[] => {
  if (options.allowJs) {
    return [...TS_EXTENSIONS, ...JS_EXTENSIONS, ".json"];
  }
  return [...TS_EXTENSIONS, ".json"];
};

const processSourceFile = (
  build: ProgramBuild,
  request: FileRequest,
  include: IncludeSourceFile,
): void => {
  const { fileName } = request;
  if (getBaseFileName(fileName).includes(".")) {
    if (fileExtensionIsOneOf(fileName.toLowerCase(), supportedExtensions(build.options))) {
      include(build, request);
    }
    return;
  }
  IMPLICIT_EXTENSIONS.some((extension) =>
    Option.isSome(include(build, { ...request, fileName: `${fileName}${extension}` })),
  );
};

const processReferencedFiles = (walk: ReferenceWalk): void => {
  const directory = getDirectoryPath(walk.sourceFile.fileName);
  for (const reference of walk.sourceFile.referencedFiles) {
    const fileName = normalizePath(combinePaths(directory, reference.fileName));
    processSourceFile(
      walk.build,
      { fileName, isDefaultLib: walk.isDefaultLib, packageId: Option.none() },
      walk.include,
    );
  }
};

const processTypeReferenceDirectives = (walk: ReferenceWalk): void => {
  const { build, sourceFile } = walk;
  const fileMode = getDefaultResolutionModeForFile(sourceFile, build.host.modeOptions);
  for (const reference of sourceFile.typeReferenceDirectives) {
    const mode = modeFromNumber(reference.resolutionMode).pipe(Option.orElse(() => fileMode));
    const lookup = { name: reference.fileName, containingFile: sourceFile.fileName, mode };
    for (const resolved of Option.toArray(build.host.resolveTypeReference(lookup))) {
      build.depth.enter(resolved.isExternalLibraryImport);
      const request = {
        fileName: resolved.resolvedFileName,
        isDefaultLib: false,
        packageId: resolved.packageId,
      };
      processSourceFile(build, request, walk.include);
      build.depth.leave(resolved.isExternalLibraryImport);
    }
  }
};

const processLibReferenceDirectives = (walk: ReferenceWalk): void => {
  const libDirectory = getDirectoryPath(walk.build.host.defaultLibFileName);
  for (const reference of walk.sourceFile.libReferenceDirectives) {
    const fileName = combinePaths(libDirectory, `lib.${reference.fileName.toLowerCase()}.d.ts`);
    processSourceFile(
      walk.build,
      { fileName, isDefaultLib: true, packageId: Option.none() },
      walk.include,
    );
  }
};

const processReferences = (walk: ReferenceWalk): void => {
  processReferencedFiles(walk);
  processTypeReferenceDirectives(walk);
  processLibReferenceDirectives(walk);
};

const resumeImports = (walk: ReferenceWalk): void => {
  walk.build.registry.setFlag(walk.sourceFile.fileName, "elided", false);
  processImportedModules(walk.build, walk.sourceFile, walk.include);
};

const isReachedFromRoot = (walk: ReferenceWalk): boolean =>
  walk.build.registry.hasFlag(walk.sourceFile.fileName, "foundInNodeModules") &&
  walk.build.depth.current() === OUTSIDE_NODE_MODULES;

const canResumeElided = (walk: ReferenceWalk): boolean =>
  walk.build.registry.hasFlag(walk.sourceFile.fileName, "elided") &&
  walk.build.depth.current() < MAX_NODE_MODULE_JS_DEPTH;

const promoteToRoot = (walk: ReferenceWalk): void => {
  walk.build.registry.setFlag(walk.sourceFile.fileName, "foundInNodeModules", false);
  processReferences(walk);
  resumeImports(walk);
};

const REVISITS: readonly (readonly [
  (walk: ReferenceWalk) => boolean,
  (walk: ReferenceWalk) => void,
])[] = [
  [isReachedFromRoot, promoteToRoot],
  [canResumeElided, resumeImports],
];

const revisitExisting = (walk: ReferenceWalk): void => {
  const revisit = Arr.findFirst(REVISITS, ([applies]) => applies(walk));
  for (const [, apply] of Option.toArray(revisit)) {
    apply(walk);
  }
};

const addNewFile = (walk: ReferenceWalk, fileName: string): void => {
  const { build, sourceFile } = walk;
  const insideNodeModules = build.depth.current() > OUTSIDE_NODE_MODULES;
  build.registry.setFlag(fileName, "foundInNodeModules", insideNodeModules);
  setPackageJsonScope(sourceFile, build.host.packageJsonScopeFor(fileName));
  processReferences(walk);
  processImportedModules(build, sourceFile, walk.include);
  build.registry.include({ fileName, sourceFile }, walk.isDefaultLib);
};

const recordOrReuseDuplicate = (
  build: ProgramBuild,
  request: FileRequest,
  file: Option.Option<SourceFile>,
): Option.Option<SourceFile> => {
  const duplicate = request.packageId.pipe(
    Option.flatMap((id) => build.registry.fileForPackage(id)),
  );
  if (Option.isNone(duplicate)) {
    build.registry.record(request, file);
    return duplicate;
  }
  build.registry.record(request, duplicate);
  build.registry.include({ fileName: request.fileName, sourceFile: duplicate.value }, false);
  return duplicate;
};

const includeSourceFile: IncludeSourceFile = (build, request) => {
  const walkOf = (sourceFile: SourceFile): ReferenceWalk => ({
    build,
    include: includeSourceFile,
    sourceFile,
    isDefaultLib: request.isDefaultLib,
  });
  const existing = build.registry.lookup(request.fileName);
  if (Option.isSome(existing)) {
    for (const sourceFile of Option.toArray(existing.value)) {
      revisitExisting(walkOf(sourceFile));
    }
    return existing.value;
  }
  const file = build.host.getSourceFile(request.fileName);
  return recordOrReuseDuplicate(build, request, file).pipe(
    Option.orElse(() => {
      for (const sourceFile of Option.toArray(file)) {
        addNewFile(walkOf(sourceFile), request.fileName);
      }
      return file;
    }),
  );
};

const createProgramFiles = (
  rootNames: readonly string[],
  options: ProgramOptions,
  host: ProgramHost,
): ProgramFiles => {
  const build = createProgramBuild(host, options);
  for (const rootName of rootNames) {
    const request = {
      fileName: normalizePath(rootName),
      isDefaultLib: false,
      packageId: Option.none(),
    };
    processSourceFile(build, request, includeSourceFile);
  }
  if (rootNames.length > NO_ROOTS) {
    const request = {
      fileName: host.defaultLibFileName,
      isDefaultLib: true,
      packageId: Option.none(),
    };
    processSourceFile(build, request, includeSourceFile);
  }
  return build.registry.result();
};

export { createProgramFiles };
