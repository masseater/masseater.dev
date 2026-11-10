import { MutableRef, Option } from "effect";

import type { TypeCheckerFacade } from "./checker.ts";
import { openChecker } from "./compiler-checker.ts";
import { LIB_FILE_NAME } from "./host-types.ts";
import type { HostWrapperCore } from "./host-types.ts";
import type { ProgramFile, ProgramFiles, ProgramOptions } from "./program-build.ts";
import { createProgramFiles } from "./program.ts";
import type { MountedFileSystem } from "./ts-api.ts";

interface Program {
  readonly getSourceFiles: () => readonly ProgramFile[];
  readonly getTypeChecker: () => TypeCheckerFacade;
}

interface ProgramSite {
  readonly core: HostWrapperCore;
  readonly mounted: MountedFileSystem;
  readonly options: ProgramOptions;
}

interface CachedProgram {
  readonly program: Program;
  readonly resolvedModules: ProgramFiles["resolvedModules"];
  readonly dispose: () => void;
}

const buildProgramFiles = (site: ProgramSite, rootNames: readonly string[]): ProgramFiles =>
  createProgramFiles(rootNames, site.options, {
    modeOptions: site.core.modeOptions,
    defaultLibFileName: LIB_FILE_NAME,
    getSourceFile: site.core.getSourceFile,
    resolveModuleName: (request) => site.core.resolve(request).result,
    resolveTypeReference: site.core.resolveTypeReference,
    packageJsonScopeFor: site.core.packageJsonScopeFor,
  });

const createProgram = (site: ProgramSite, rootNames: readonly string[]): CachedProgram => {
  const programFiles = buildProgramFiles(site, rootNames);
  const checkerSite = { core: site.core, mountRoot: site.mounted.root, options: site.options };
  const checker = MutableRef.make(Option.none<TypeCheckerFacade>());
  const openCheckerOnce = (): TypeCheckerFacade =>
    Option.getOrElse(MutableRef.get(checker), () => {
      const created = openChecker(checkerSite, programFiles.files, rootNames);
      MutableRef.set(checker, Option.some(created));
      return created;
    });
  return {
    program: { getSourceFiles: () => programFiles.files, getTypeChecker: openCheckerOnce },
    resolvedModules: programFiles.resolvedModules,
    dispose: () => {
      for (const created of Option.toArray(MutableRef.get(checker))) {
        created.dispose();
      }
    },
  };
};

export { createProgram };
export type { CachedProgram, Program, ProgramSite };
