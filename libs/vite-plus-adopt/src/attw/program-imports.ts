import { Option, Array as Arr, String as Str, pipe, Function as Fn } from "effect";
import type { Node, SourceFile } from "typescript/ast";
import { isStringLiteralLikeNode } from "typescript/ast/is";

import { getModeForUsageLocation } from "./module-mode.ts";
import type { IncludeSourceFile, ProgramBuild, ResolvedModuleEntry } from "./program-build.ts";
import type { ResolvedModule } from "./resolution-types.ts";
import {
  collectExternalModuleReferences,
  importsOf,
  isJSDocNode,
  isSourceFileJS,
  moduleAugmentationsOf,
} from "./source-file.ts";

const DATA_FIRST_ARITY_3 = 3;

interface ModuleNameSite {
  readonly node: Node;
  readonly text: string;
  readonly isImport: boolean;
}

interface ImportSite {
  readonly site: ModuleNameSite;
  readonly entry: ResolvedModuleEntry;
}

interface ImportWalk {
  readonly build: ProgramBuild;
  readonly include: IncludeSourceFile;
  readonly importer: SourceFile;
}

const MAX_NODE_MODULE_JS_DEPTH = 0;
const EMPTY = 0;
const TS_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".d.ts",
  ".cts",
  ".d.cts",
  ".mts",
  ".d.mts",
]);
const JS_EXTENSIONS: ReadonlySet<string> = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const JSX_EXTENSIONS: ReadonlySet<string> = new Set([".tsx", ".jsx"]);

const isTsOrJsonResolution = (extension: string): boolean =>
  TS_EXTENSIONS.has(extension) ||
  extension === ".json" ||
  (Str.startsWith(".d.")(extension) && Str.endsWith(".ts")(extension));

const isKnownExtension = (extension: string): boolean =>
  TS_EXTENSIONS.has(extension) || JS_EXTENSIONS.has(extension) || extension === ".json";

const hasResolutionDiagnostic = (module: ResolvedModule, importer: SourceFile): boolean =>
  JSX_EXTENSIONS.has(module.extension) ||
  (!isKnownExtension(module.extension) && !importer.isDeclarationFile);

const literalSites = (nodes: readonly Node[], isImport: boolean): readonly ModuleNameSite[] =>
  pipe(
    nodes,
    Arr.flatMap((node) => {
      if (isStringLiteralLikeNode(node)) {
        return [{ node, text: node.text, isImport }];
      }
      return [];
    }),
  );

const moduleNameSitesOf = (sourceFile: SourceFile): readonly ModuleNameSite[] => [
  ...literalSites(importsOf(sourceFile), true),
  ...literalSites(moduleAugmentationsOf(sourceFile), false),
];

const resolveSite = (
  build: ProgramBuild,
  importer: SourceFile,
  site: ModuleNameSite,
): ImportSite => {
  const mode = getModeForUsageLocation(importer, site.node, build.host.modeOptions);
  const resolution = build.host.resolveModuleName({
    moduleName: site.text,
    containingFile: importer.fileName,
    mode,
    noDtsResolution: build.options.noDtsResolution,
  });
  return { site, entry: { moduleName: site.text, mode, resolution } };
};

const isAllowedExtension = (walk: ImportWalk, module: ResolvedModule): boolean =>
  isTsOrJsonResolution(module.extension) || walk.build.options.allowJs;

const isVisibleSite = (walk: ImportWalk, site: ModuleNameSite): boolean =>
  site.isImport && (isSourceFileJS(walk.importer) || !isJSDocNode(site.node));

const shouldAddFile = (walk: ImportWalk, site: ModuleNameSite, module: ResolvedModule): boolean =>
  !hasResolutionDiagnostic(module, walk.importer) &&
  isAllowedExtension(walk, module) &&
  isVisibleSite(walk, site);

const isElidedImport = (build: ProgramBuild, module: ResolvedModule): boolean =>
  module.isExternalLibraryImport &&
  !isTsOrJsonResolution(module.extension) &&
  build.depth.current() > MAX_NODE_MODULE_JS_DEPTH;

const followResolvedModule = (
  walk: ImportWalk,
  site: ModuleNameSite,
  module: ResolvedModule,
): void => {
  const { build } = walk;
  build.depth.enter(module.isExternalLibraryImport);
  if (isElidedImport(build, module)) {
    build.registry.setFlag(walk.importer.fileName, "elided", true);
  } else if (shouldAddFile(walk, site, module)) {
    walk.include(build, {
      fileName: module.resolvedFileName,
      isDefaultLib: false,
      packageId: module.packageId,
    });
  }
  build.depth.leave(module.isExternalLibraryImport);
};

const processImportedModules: {
  (importer: SourceFile, include: IncludeSourceFile): (build: ProgramBuild) => void;
  (build: ProgramBuild, importer: SourceFile, include: IncludeSourceFile): void;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (build: ProgramBuild, importer: SourceFile, include: IncludeSourceFile): void => {
    collectExternalModuleReferences(importer);
    const sites = moduleNameSitesOf(importer);
    if (sites.length === EMPTY) {
      return;
    }
    const resolved = pipe(
      sites,
      Arr.map((site) => resolveSite(build, importer, site)),
    );
    build.registry.recordResolutions(
      importer.fileName,
      pipe(
        resolved,
        Arr.map(({ entry }) => entry),
      ),
    );
    const walk: ImportWalk = { build, include, importer };
    for (const { site, entry } of resolved) {
      for (const module of Option.toArray(entry.resolution.resolvedModule)) {
        followResolvedModule(walk, site, module);
      }
    }
  },
);

export { processImportedModules };
