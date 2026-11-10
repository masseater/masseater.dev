import { Option, Predicate } from "effect";
import type { SourceFile } from "typescript/ast";
import { serverFS } from "typescript/fs";
import type { FileSystemCallbacks, FileSystemEntries } from "typescript/fs";
import { API } from "typescript/sync";
import type { ScriptKind } from "typescript/sync";

import { ensureTrailingDirectorySeparator } from "./paths.ts";

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
const MOUNT_DIRECTORY = MOUNT_ROOT.slice(SEPARATOR.length);

const mounts = new Map<string, WeakRef<VirtualFileSystem>>();
const counter = { next: 0 };

const mountOf = (path: string): Option.Option<Mount> => {
  if (!path.startsWith(`${MOUNT_ROOT}${SEPARATOR}`)) {
    return Option.none();
  }
  const rest = path.slice(MOUNT_ROOT.length + SEPARATOR.length);
  const end = rest.indexOf(SEPARATOR);
  const id = Option.match(
    Option.liftPredicate(end, (index) => index >= SECOND),
    {
      onNone: () => rest,
      onSome: (index) => rest.slice(START, index),
    },
  );
  const inner = Option.liftPredicate(
    rest.slice(id.length),
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
  const children = paths
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length));
  const nested = children.filter((child) => child.includes(SEPARATOR));
  return {
    files: uniqueEntries(children.filter((child) => !child.includes(SEPARATOR))),
    directories: uniqueEntries(nested.map((child) => child.slice(START, child.indexOf(SEPARATOR)))),
    symlinks: [],
  };
};

const liveMountIds = (): string[] =>
  [...mounts.entries()]
    .filter(([, reference]) => Predicate.isNotUndefined(reference.deref()))
    .map(([id]) => id);

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

const parseSourceFile = (
  fileName: string,
  text: string,
  scriptKind: Option.Option<ScriptKind>,
): SourceFile => {
  const retained = sharedApi().createSourceFile(
    fileName,
    text,
    Option.match(scriptKind, { onNone: () => ({}), onSome: (kind) => ({ scriptKind: kind }) }),
  );
  const { sourceFile } = retained;
  retained.dispose();
  return sourceFile;
};

export { mount, parseSourceFile, sharedApi };
export type { MountedFileSystem, VirtualFileSystem };
