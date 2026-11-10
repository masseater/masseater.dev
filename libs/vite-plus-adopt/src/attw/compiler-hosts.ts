import { Option, Predicate } from "effect";
import { ModuleResolutionKind } from "typescript/sync";

import { wrapHost } from "./compiler-host-wrapper.ts";
import type { CompilerHostWrapper } from "./compiler-host-wrapper.ts";
import { LIB_FILE_NAME } from "./host-types.ts";
import type { PackageFileSystem } from "./host-types.ts";
import { createHostWrapper } from "./host-wrapper.ts";
import type { ResolutionKind } from "./resolution-types.ts";
import { mount } from "./ts-api.ts";
import type { MountedFileSystem } from "./ts-api.ts";

interface CompilerHosts {
  readonly node10: CompilerHostWrapper;
  readonly node16: CompilerHostWrapper;
  readonly bundler: CompilerHostWrapper;
  readonly findHostForFiles: (files: readonly string[]) => CompilerHostWrapper | undefined;
}

const RESOLUTION_KINDS_BY_OPTION: ReadonlyMap<number, ResolutionKind> = new Map([
  [ModuleResolutionKind.Node10, "Node10"],
  [ModuleResolutionKind.Node16, "Node16"],
  [ModuleResolutionKind.NodeNext, "Node16"],
  [ModuleResolutionKind.Bundler, "Bundler"],
]);

const mountFileSystem = (fs: PackageFileSystem, minimalLib: string): MountedFileSystem =>
  mount({
    fileExists: (path) => path === LIB_FILE_NAME || fs.fileExists(path),
    directoryExists: (path) => fs.directoryExists(path),
    readFile: (path) => {
      if (path === LIB_FILE_NAME) {
        return Option.some(minimalLib);
      }
      return Option.fromNullishOr(fs.tryReadFile(path));
    },
    listFiles: () => [LIB_FILE_NAME, ...fs.listFiles()],
  });

const createCompilerHostWrapperWith = (
  fs: PackageFileSystem,
  moduleResolution: number,
  minimalLib: string,
): CompilerHostWrapper => {
  const kind = RESOLUTION_KINDS_BY_OPTION.get(moduleResolution);
  if (Predicate.isUndefined(kind)) {
    throw new TypeError(`Unsupported module resolution kind: ${String(moduleResolution)}`);
  }
  return wrapHost(createHostWrapper({ fs, kind, minimalLib }), {
    mounted: mountFileSystem(fs, minimalLib),
  });
};

const createCompilerHostsWith = (fs: PackageFileSystem, minimalLib: string): CompilerHosts => {
  const mounted = mountFileSystem(fs, minimalLib);
  const create = (kind: ResolutionKind): CompilerHostWrapper =>
    wrapHost(createHostWrapper({ fs, kind, minimalLib }), { mounted });
  const node10 = create("Node10");
  const node16 = create("Node16");
  const bundler = create("Bundler");
  return {
    node10,
    node16,
    bundler,
    findHostForFiles: (files) =>
      [node10, node16, bundler].find((host) =>
        files.every((file) => Predicate.isNotUndefined(host.getSourceFileFromCache(file))),
      ),
  };
};

export { createCompilerHostWrapperWith, createCompilerHostsWith };
export type { CompilerHosts };
