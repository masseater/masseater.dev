import { Option } from "effect";
import type { SourceFile } from "typescript/ast";

import { createProgram } from "./compiler-program.ts";
import type { CachedProgram, Program, ProgramSite } from "./compiler-program.ts";
import { toTsResolution } from "./host-resolutions.ts";
import type { HostWrapperCore, ModuleKindInfo, TsResolution } from "./host-types.ts";
import { toPath } from "./paths.ts";
import type { ProgramOptions, ResolvedModuleEntry } from "./program-build.ts";
import { modeKey } from "./resolution-cache.ts";
import { modeFromNumber } from "./resolution-mode-numbers.ts";
import type { ResolutionMode } from "./resolution-types.ts";

interface ExtraOptions {
  readonly allowJs?: boolean;
  readonly checkJs?: boolean;
  readonly noDtsResolution?: boolean;
}

interface ModuleNameResolution {
  readonly resolution: TsResolution;
  readonly trace: readonly string[];
}

type ResolveModuleNameArguments = readonly [
  moduleName: string,
  containingFile: string,
  resolutionMode?: number,
  noDtsResolution?: boolean,
];

interface CompilerHostWrapper {
  readonly getCompilerOptions: () => Readonly<Record<string, number | boolean>>;
  readonly getSourceFile: (fileName: string) => SourceFile | undefined;
  readonly getSourceFileFromCache: (fileName: string) => SourceFile | undefined;
  readonly getModuleKindForFile: (fileName: string) => ModuleKindInfo | undefined;
  readonly resolveModuleName: (...args: ResolveModuleNameArguments) => ModuleNameResolution;
  readonly getTrace: (
    fileName: string,
    moduleSpecifier: string,
    resolutionMode: number | undefined,
  ) => readonly string[] | undefined;
  readonly createPrimaryProgram: (rootName: string) => Program;
  readonly createAuxiliaryProgram: (
    rootNames: readonly string[],
    extraOptions?: ExtraOptions,
  ) => Program;
  readonly getResolvedModule: (
    sourceFile: SourceFile,
    moduleName: string,
    resolutionMode: number | undefined,
  ) => TsResolution | undefined;
}

interface ResolvedModuleTable {
  readonly record: (fileName: string, entries: readonly ResolvedModuleEntry[]) => void;
  readonly lookup: (
    fileName: string,
    moduleName: string,
    mode: Option.Option<ResolutionMode>,
  ) => Option.Option<TsResolution>;
}

type ProgramLookup = (rootNames: readonly string[], options: ProgramOptions) => CachedProgram;

const PROGRAM_CACHE_SIZE = 2;
const PRIMARY_OPTIONS: ProgramOptions = { allowJs: false, noDtsResolution: false };

const createProgramCache = (site: Omit<ProgramSite, "options">): ProgramLookup => {
  const programs = new Map<string, CachedProgram>();
  return (rootNames, options) => {
    const key = JSON.stringify([rootNames, options.allowJs, options.noDtsResolution]);
    const program = programs.get(key) ?? createProgram({ ...site, options }, rootNames);
    programs.delete(key);
    programs.set(key, program);
    for (const [staleKey, stale] of programs) {
      if (programs.size <= PROGRAM_CACHE_SIZE) {
        break;
      }
      programs.delete(staleKey);
      stale.dispose();
    }
    return program;
  };
};

const createResolvedModuleTable = (): ResolvedModuleTable => {
  const byFile = new Map<string, Map<string, TsResolution>>();
  return {
    record: (fileName, entries) => {
      const path = toPath(fileName);
      const own = byFile.get(path) ?? new Map<string, TsResolution>();
      byFile.set(path, own);
      for (const entry of entries) {
        own.set(modeKey(entry.moduleName, entry.mode), toTsResolution(entry.resolution));
      }
    },
    lookup: (fileName, moduleName, mode) =>
      Option.fromNullishOr(byFile.get(toPath(fileName))).pipe(
        Option.flatMap((own) => Option.fromNullishOr(own.get(modeKey(moduleName, mode)))),
      ),
  };
};

const auxiliaryOptions = (extraOptions: ExtraOptions | undefined): ProgramOptions => {
  const extra = Option.fromNullishOr(extraOptions);
  return {
    allowJs: Option.exists(extra, (options) => options.allowJs === true),
    noDtsResolution: Option.exists(extra, (options) => options.noDtsResolution === true),
  };
};

const resolveModuleNameWith =
  (core: HostWrapperCore) =>
  (
    ...[moduleName, containingFile, resolutionMode, noDtsResolution]: ResolveModuleNameArguments
  ): ModuleNameResolution => {
    const entry = core.resolve({
      moduleName,
      containingFile,
      mode: modeFromNumber(resolutionMode),
      noDtsResolution: noDtsResolution === true,
    });
    return { resolution: entry.resolution, trace: entry.trace };
  };

const wrapHost = (
  core: HostWrapperCore,
  site: Omit<ProgramSite, "core" | "options">,
): CompilerHostWrapper => {
  const getProgram = createProgramCache({ ...site, core });
  const resolvedModules = createResolvedModuleTable();
  return {
    getCompilerOptions: () => core.compilerOptions,
    getSourceFile: (fileName) => Option.getOrUndefined(core.getSourceFile(fileName)),
    getSourceFileFromCache: (fileName) =>
      Option.getOrUndefined(core.getSourceFileFromCache(fileName)),
    getModuleKindForFile: (fileName) => Option.getOrUndefined(core.getModuleKindForFile(fileName)),
    resolveModuleName: resolveModuleNameWith(core),
    getTrace: (containingFile, moduleName, resolutionMode) =>
      Option.getOrUndefined(
        core.getTrace({
          moduleName,
          containingFile,
          mode: modeFromNumber(resolutionMode),
          noDtsResolution: false,
        }),
      ),
    createPrimaryProgram: (rootName) => {
      const created = getProgram([rootName], PRIMARY_OPTIONS);
      for (const [fileName, entries] of created.resolvedModules) {
        resolvedModules.record(fileName, entries);
      }
      return created.program;
    },
    createAuxiliaryProgram: (rootNames, extraOptions) =>
      getProgram(rootNames, auxiliaryOptions(extraOptions)).program,
    getResolvedModule: (sourceFile, moduleName, resolutionMode) =>
      Option.getOrUndefined(
        resolvedModules.lookup(sourceFile.fileName, moduleName, modeFromNumber(resolutionMode)),
      ),
  };
};

export { wrapHost };
export type { CompilerHostWrapper, ExtraOptions, ModuleNameResolution, ResolveModuleNameArguments };
