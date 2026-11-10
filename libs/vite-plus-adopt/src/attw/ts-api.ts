import { Option, Predicate, Array as Arr, String as Str, pipe, Function as Fn } from "effect";
import type { SourceFile } from "typescript/ast";
import { serverFS } from "typescript/fs";
import type { FileSystemCallbacks, FileSystemEntries } from "typescript/fs";
import { API } from "typescript/sync";
import type { ScriptKind } from "typescript/sync";

import { ensureTrailingDirectorySeparator } from "./paths.ts";

const DATA_FIRST_ARITY_3 = 3;

interface VirtualFileSystem {
  readonly fileExists: (path: string) => boolean;
  readonly directoryExists: (path: string) => boolean;
  readonly readFile: (path: string) => Option.Option<string>;
  readonly listFiles: () => readonly string[];
}

interface Mount {
  readonly fileSystem: VirtualFileSystem;
  readonly path: string;
}

interface MountedFileSystem {
  readonly fileSystem: VirtualFileSystem;
  readonly root: string;
}

const MOUNT_ROOT = "/attw";
const SEPARATOR = "/";
const START = 0;
const SECOND = 1;
const MOUNT_DIRECTORY = Str.slice(SEPARATOR.length)(MOUNT_ROOT);

const mounts = new Map<string, WeakRef<VirtualFileSystem>>();
const counter = { next: 0 };

const mountOf = (path: string): Option.Option<Mount> => {
  if (!Str.startsWith(`${MOUNT_ROOT}${SEPARATOR}`)(path)) {
    return Option.none();
  }
  const rest = Str.slice(MOUNT_ROOT.length + SEPARATOR.length)(path);
  const id = Option.match(
    Option.filter(Str.indexOf(SEPARATOR)(rest), (index) => index >= SECOND),
    {
      onNone: () => rest,
      onSome: (index) => Str.slice(START, index)(rest),
    },
  );
  const inner = Option.liftPredicate(
    Str.slice(id.length)(rest),
    (remainder) => remainder.length > START,
  );
  return Option.fromNullishOr(mounts.get(id)).pipe(
    Option.flatMap((reference) => Option.fromNullishOr(reference.deref())),
    Option.map((fileSystem) => ({ fileSystem, path: Option.getOrElse(inner, () => SEPARATOR) })),
  );
};

const uniqueEntries = (names: readonly string[]): string[] => [...new Set(names)];

const childEntries = (paths: readonly string[], directory: string): FileSystemEntries => {
  const prefix = ensureTrailingDirectorySeparator(directory);
  const children = pipe(
    paths,
    Arr.filter((path) => Str.startsWith(prefix)(path)),
    Arr.map((path) => Str.slice(prefix.length)(path)),
  );
  const nested = pipe(
    children,
    Arr.filter((child) => Str.includes(SEPARATOR)(child)),
  );
  return {
    files: uniqueEntries(
      pipe(
        children,
        Arr.filter((child) => !Str.includes(SEPARATOR)(child)),
      ),
    ),
    directories: uniqueEntries(
      pipe(
        nested,
        Arr.map((child) =>
          Option.match(Str.indexOf(SEPARATOR)(child), {
            onNone: () => child,
            onSome: (end) => Str.slice(START, end)(child),
          }),
        ),
      ),
    ),
    symlinks: [],
  };
};

const liveMountIds = (): string[] =>
  pipe(
    [...mounts.entries()],
    Arr.filter(([, reference]) => Predicate.isNotUndefined(reference.deref())),
    Arr.map(([id]) => id),
  );

const ANCESTOR_DIRECTORIES: ReadonlyMap<string, () => readonly string[]> = new Map([
  [SEPARATOR, (): readonly string[] => [MOUNT_DIRECTORY]],
  [MOUNT_ROOT, liveMountIds],
]);

const ancestorEntries = (path: string): FileSystemEntries => ({
  files: [],
  directories: Option.fromNullishOr(ANCESTOR_DIRECTORIES.get(path)).pipe(
    Option.map((directories) => [...directories()]),
    Option.getOrElse((): string[] => []),
  ),
  symlinks: [],
});

const isMountAncestor = (path: string): boolean =>
  path === SEPARATOR || path === MOUNT_ROOT || Option.isSome(mountOf(`${path}${SEPARATOR}`));

const routedFileSystem: FileSystemCallbacks = {
  fileExists: (path) =>
    Option.match(mountOf(path), {
      onNone: () => false,
      onSome: (mount) => mount.fileSystem.fileExists(mount.path),
    }),
  directoryExists: (path) =>
    Option.match(mountOf(path), {
      onNone: () => isMountAncestor(path),
      onSome: (mount) => mount.path === SEPARATOR || mount.fileSystem.directoryExists(mount.path),
    }),
  readFile: (path) =>
    Option.getOrUndefined(
      mountOf(path).pipe(Option.flatMap((mount) => mount.fileSystem.readFile(mount.path))),
    ),
  getAccessibleEntries: (path) =>
    Option.match(mountOf(path), {
      onNone: () => ancestorEntries(path),
      onSome: (mount) => childEntries(mount.fileSystem.listFiles(), mount.path),
    }),
  realpath: serverFS.identity,
  stat: serverFS.fakeStat,
  writeFile: serverFS.error,
  removeFile: serverFS.error,
};

const holder: { api: Option.Option<API> } = { api: Option.none() };

const sharedApi = (): API =>
  Option.getOrElse(holder.api, () => {
    const created = new API({
      cwd: SEPARATOR,
      useCaseSensitiveFileNames: true,
      fs: routedFileSystem,
    });
    holder.api = Option.some(created);
    return created;
  });

const mount = (fileSystem: VirtualFileSystem): MountedFileSystem => {
  counter.next += SECOND;
  const id = String(counter.next);
  for (const [key, reference] of mounts) {
    if (Predicate.isUndefined(reference.deref())) {
      mounts.delete(key);
    }
  }
  mounts.set(id, new WeakRef(fileSystem));
  return { fileSystem, root: `${MOUNT_ROOT}${SEPARATOR}${id}` };
};

const parseSourceFile: {
  (text: string, scriptKind: Option.Option<ScriptKind>): (fileName: string) => SourceFile;
  (fileName: string, text: string, scriptKind: Option.Option<ScriptKind>): SourceFile;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (fileName: string, text: string, scriptKind: Option.Option<ScriptKind>): SourceFile => {
    const retained = sharedApi().createSourceFile(
      fileName,
      text,
      Option.match(scriptKind, { onNone: () => ({}), onSome: (kind) => ({ scriptKind: kind }) }),
    );
    const { sourceFile } = retained;
    retained.dispose();
    return sourceFile;
  },
);

export { mount, parseSourceFile, sharedApi };
export type { MountedFileSystem, VirtualFileSystem };
