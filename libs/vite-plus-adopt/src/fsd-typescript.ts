import { Option, pipe } from "effect";
import { serverFS } from "typescript/fs";
import type { FileSystemCallbacks } from "typescript/fs";
import {
  rootedDirectoryPathFromPath,
  rootedPathFromNormalized,
  toRootedDirectoryPath,
  toRootedFilePath,
} from "typescript/path";
import { API } from "typescript/sync";
import type { ModuleResolver } from "typescript/sync";

interface ResolutionHost {
  readonly fileExists: (fileName: string) => boolean;
  readonly directoryExists?: ((directoryName: string) => boolean) | undefined;
}

interface Resolution {
  readonly resolvedModule: { readonly resolvedFileName: string } | undefined;
}

type ResolveArguments = readonly [
  moduleName: string,
  containingFile: string,
  compilerOptions: object,
  host: ResolutionHost,
];

const CWD = rootedDirectoryPathFromPath(rootedPathFromNormalized(process.cwd()));

const PREFIX = `${CWD}/`;

const current: { host: Option.Option<ResolutionHost>; relative: boolean } = {
  host: Option.none(),
  relative: false,
};

const toCaller = (fileName: string): string =>
  Option.liftPredicate(fileName, (name) => current.relative && name.startsWith(PREFIX)).pipe(
    Option.match({ onSome: (name) => name.slice(PREFIX.length), onNone: () => fileName }),
  );

const directoryExistsOf = (host: ResolutionHost, directoryName: string): boolean =>
  Option.fromNullishOr(host.directoryExists).pipe(
    Option.match({
      onSome: (directoryExists) => directoryExists(toCaller(directoryName)),
      onNone: () => true,
    }),
  );

const callerFileSystem: FileSystemCallbacks = {
  fileExists: (fileName) =>
    current.host.pipe(
      Option.match({
        onSome: (host) => host.fileExists(toCaller(fileName)),
        onNone: () => serverFS.useOS,
      }),
    ),
  directoryExists: (directoryName) =>
    current.host.pipe(
      Option.match({
        onSome: (host) => directoryExistsOf(host, directoryName),
        onNone: () => serverFS.useOS,
      }),
    ),
  getAccessibleEntries: serverFS.useOS,
  readFile: serverFS.useOS,
  realpath: serverFS.useOS,
  stat: serverFS.useOS,
  writeFile: serverFS.useOS,
  removeFile: serverFS.useOS,
};

const createResolverCache = (): ((compilerOptions: object) => ModuleResolver) => {
  const api = new API({ cwd: CWD, fs: callerFileSystem });
  const byOptions = new Map<string, ModuleResolver>();
  return (compilerOptions) => {
    const key = JSON.stringify(compilerOptions);
    return Option.fromNullishOr(byOptions.get(key)).pipe(
      Option.getOrElse(() => {
        const { options } = api.parseJsonConfigFileContent(
          { compilerOptions },
          { configDirectory: CWD },
        );
        const created = api.createModuleResolver(options);
        byOptions.set(key, created);
        return created;
      }),
    );
  };
};

const resolverCache: { value: Option.Option<(compilerOptions: object) => ModuleResolver> } = {
  value: Option.none(),
};

const resolverFor = (compilerOptions: object): ModuleResolver =>
  resolverCache.value.pipe(
    Option.getOrElse(() => {
      const created = createResolverCache();
      resolverCache.value = Option.some(created);
      return created;
    }),
  )(compilerOptions);

const resolveModuleName = (
  ...[moduleName, containingFile, compilerOptions, host]: ResolveArguments
): Resolution => {
  const containingPath = toRootedFilePath(containingFile, CWD);
  current.host = Option.some(host);
  current.relative = containingPath !== containingFile;
  const { resolvedModule } = resolverFor(compilerOptions).resolveModuleName(
    moduleName,
    toRootedDirectoryPath("..", rootedDirectoryPathFromPath(containingPath)),
  );
  return {
    resolvedModule: pipe(
      Option.fromNullishOr(resolvedModule),
      Option.map(({ resolvedFileName }) => ({ resolvedFileName: toCaller(resolvedFileName) })),
      Option.getOrUndefined,
    ),
  };
};

const ts = {
  resolveModuleName,
  sys: {},
  ModuleKind: {},
  ModuleResolutionKind: {},
  ModuleDetectionKind: {},
  NewLineKind: {},
  ScriptTarget: {},
} as const;

export default ts;
