import { MutableRef, Option } from "effect";
import type { SourceFile } from "typescript/ast";

import type { ModeOptions } from "./module-mode.ts";
import { packageIdToString } from "./package-json.ts";
import { toPath } from "./paths.ts";
import type {
  PackageId,
  PackageJsonInfo,
  ResolutionMode,
  ResolutionResult,
} from "./resolution-types.ts";
import type { ResolvedTypeReference } from "./type-reference.ts";

interface ProgramOptions {
  readonly allowJs: boolean;
  readonly noDtsResolution: boolean;
}

interface ModuleNameRequest {
  readonly moduleName: string;
  readonly containingFile: string;
  readonly mode: Option.Option<ResolutionMode>;
  readonly noDtsResolution: boolean;
}

interface TypeReferenceLookup {
  readonly name: string;
  readonly containingFile: string;
  readonly mode: Option.Option<ResolutionMode>;
}

interface ProgramHost {
  readonly modeOptions: ModeOptions;
  readonly defaultLibFileName: string;
  readonly getSourceFile: (fileName: string) => Option.Option<SourceFile>;
  readonly resolveModuleName: (request: ModuleNameRequest) => ResolutionResult;
  readonly resolveTypeReference: (
    request: TypeReferenceLookup,
  ) => Option.Option<ResolvedTypeReference>;
  readonly packageJsonScopeFor: (fileName: string) => Option.Option<PackageJsonInfo>;
}

interface ProgramFile {
  readonly fileName: string;
  readonly sourceFile: SourceFile;
}

interface ResolvedModuleEntry {
  readonly moduleName: string;
  readonly mode: Option.Option<ResolutionMode>;
  readonly resolution: ResolutionResult;
}

interface ProgramFiles {
  readonly files: readonly ProgramFile[];
  readonly resolvedModules: ReadonlyMap<string, readonly ResolvedModuleEntry[]>;
}

interface FileRequest {
  readonly fileName: string;
  readonly isDefaultLib: boolean;
  readonly packageId: Option.Option<PackageId>;
}

type FileFlag = "foundInNodeModules" | "elided";

interface FileRegistry {
  readonly lookup: (fileName: string) => Option.Option<Option.Option<SourceFile>>;
  readonly record: (request: FileRequest, file: Option.Option<SourceFile>) => void;
  readonly include: (file: ProgramFile, isDefaultLib: boolean) => void;
  readonly fileForPackage: (packageId: PackageId) => Option.Option<SourceFile>;
  readonly setFlag: (fileName: string, flag: FileFlag, value: boolean) => void;
  readonly hasFlag: (fileName: string, flag: FileFlag) => boolean;
  readonly recordResolutions: (fileName: string, entries: readonly ResolvedModuleEntry[]) => void;
  readonly result: () => ProgramFiles;
}

interface DepthCounter {
  readonly current: () => number;
  readonly enter: (external: boolean) => void;
  readonly leave: (external: boolean) => void;
}

interface ProgramBuild {
  readonly host: ProgramHost;
  readonly options: ProgramOptions;
  readonly registry: FileRegistry;
  readonly depth: DepthCounter;
}

type IncludeSourceFile = (build: ProgramBuild, request: FileRequest) => Option.Option<SourceFile>;

const OUTSIDE_NODE_MODULES = 0;

const createDepthCounter = (): DepthCounter => {
  const depth = MutableRef.make(OUTSIDE_NODE_MODULES);
  return {
    current: () => MutableRef.get(depth),
    enter: (external) => {
      if (external) {
        MutableRef.increment(depth);
      }
    },
    leave: (external) => {
      if (external) {
        MutableRef.decrement(depth);
      }
    },
  };
};

const createFlagStore = (): Pick<FileRegistry, "hasFlag" | "setFlag"> => {
  const flags = new Map<string, Set<FileFlag>>();
  return {
    hasFlag: (fileName, flag) =>
      Option.fromNullishOr(flags.get(toPath(fileName))).pipe(Option.exists((own) => own.has(flag))),
    setFlag: (fileName, flag, value) => {
      const path = toPath(fileName);
      const own = flags.get(path) ?? new Set<FileFlag>();
      flags.set(path, own);
      if (value) {
        own.add(flag);
        return;
      }
      own.delete(flag);
    },
  };
};

const createFileRegistry = (): FileRegistry => {
  const filesByName = new Map<string, Option.Option<SourceFile>>();
  const byPackage = new Map<string, SourceFile>();
  const resolvedModules = new Map<string, readonly ResolvedModuleEntry[]>();
  const defaultLibFiles: ProgramFile[] = [];
  const otherFiles: ProgramFile[] = [];
  return {
    ...createFlagStore(),
    lookup: (fileName) => Option.fromNullishOr(filesByName.get(toPath(fileName))),
    record: (request, file) => {
      for (const [id, sourceFile] of Option.toArray(Option.all([request.packageId, file]))) {
        byPackage.set(packageIdToString(id), sourceFile);
      }
      filesByName.set(toPath(request.fileName), file);
    },
    include: (file, isDefaultLib) => {
      if (isDefaultLib) {
        defaultLibFiles.push(file);
        return;
      }
      otherFiles.push(file);
    },
    fileForPackage: (packageId) =>
      Option.fromNullishOr(byPackage.get(packageIdToString(packageId))),
    recordResolutions: (fileName, entries) => {
      resolvedModules.set(toPath(fileName), entries);
    },
    result: () => ({ files: [...defaultLibFiles, ...otherFiles], resolvedModules }),
  };
};

const createProgramBuild = (host: ProgramHost, options: ProgramOptions): ProgramBuild => ({
  host,
  options,
  registry: createFileRegistry(),
  depth: createDepthCounter(),
});

export { createProgramBuild };
export type {
  DepthCounter,
  FileFlag,
  FileRegistry,
  FileRequest,
  IncludeSourceFile,
  ModuleNameRequest,
  ProgramBuild,
  ProgramFile,
  ProgramFiles,
  ProgramHost,
  ProgramOptions,
  ResolvedModuleEntry,
  TypeReferenceLookup,
};
