import { Array as Arr, Effect, FileSystem, Path, String as Str, pipe } from "effect";
import type { PlatformError } from "effect";

const LICENSE_PREFIX = "LICENSE-";
const SERVERS = ["llama-server", "llama-server.exe"];
const CPU_BACKEND = "ggml-cpu";
const LIBRARY = /\.(?:so(?:\.\d+)*|dylib|dll)$/u;

const decoder = new TextDecoder("latin1");

/** @internal */
export type Directories = Readonly<{ llama: string; licenses: string }>;

type Link = Readonly<{ link: string; target: string }>;

type Growth = Readonly<{
  llama: string;
  kept: readonly string[];
  texts: readonly string[];
  candidates: readonly string[];
}>;

const isServer = (name: string): boolean =>
  pipe(SERVERS, Arr.contains(name)) || Str.includes(CPU_BACKEND)(name);

const isLibrary = (name: string): boolean => LIBRARY.test(name) && !isServer(name);

const licenseName = (name: string): string =>
  `${Str.replace(LICENSE_PREFIX, "")(name)}-LICENSE.txt`;

const moveLicenses = Effect.fn("closure.moveLicenses")(function* moveLicenses({
  llama,
  licenses,
}: Directories) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(llama);
  yield* pipe(
    names,
    Arr.filter(Str.startsWith(LICENSE_PREFIX)),
    Effect.forEach((name) =>
      fileSystem.rename(path.join(llama, name), path.join(licenses, licenseName(name))),
    ),
  );
});

const linksIn = Effect.fn("closure.linksIn")(function* linksIn(llama: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(llama);
  const links = yield* pipe(
    names,
    Effect.forEach((name) =>
      fileSystem.readLink(path.join(llama, name)).pipe(
        Effect.map((target): Link => ({
          link: path.join(llama, name),
          target: path.join(llama, target),
        })),
        Effect.option,
      ),
    ),
  );
  return Arr.getSomes(links);
});

const flattenLinks = Effect.fn("closure.flattenLinks")(function* flattenLinks(llama: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const links = yield* linksIn(llama);
  const linked = pipe(
    links,
    Arr.map(({ link }) => link),
  );
  yield* pipe(
    links,
    Arr.filter(({ target }) => !pipe(linked, Arr.contains(target))),
    Effect.forEach(({ link, target }) =>
      Effect.andThen(fileSystem.remove(link), fileSystem.rename(target, link)),
    ),
  );
  const remaining = yield* linksIn(llama);
  yield* pipe(
    remaining,
    Effect.forEach(({ link }) => fileSystem.remove(link)),
  );
});

const textsOf = Effect.fn("closure.textsOf")(function* textsOf(
  llama: string,
  names: readonly string[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* pipe(
    names,
    Effect.forEach((name) =>
      Effect.map(fileSystem.readFile(path.join(llama, name)), (bytes) => decoder.decode(bytes)),
    ),
  );
});

const mentioned =
  (texts: readonly string[]) =>
  (name: string): boolean =>
    pipe(texts, Arr.some(Str.includes(name)));

const grow = ({
  llama,
  kept,
  texts,
  candidates,
}: Growth): Effect.Effect<
  readonly string[],
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* grown() {
    const needed = pipe(candidates, Arr.filter(mentioned(texts)));
    if (Arr.isReadonlyArrayEmpty(needed)) {
      return kept;
    }
    const added = yield* textsOf(llama, needed);
    return yield* grow({
      llama,
      kept: Arr.appendAll(kept, needed),
      texts: Arr.appendAll(texts, added),
      candidates: Arr.difference(candidates, needed),
    });
  });

const keepServer = Effect.fn("closure.keepServer")(function* keepServer(llama: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(llama);
  const servers = pipe(names, Arr.filter(isServer));
  const texts = yield* textsOf(llama, servers);
  const candidates = pipe(names, Arr.filter(isLibrary));
  const kept = yield* grow({ llama, kept: servers, texts, candidates });
  yield* pipe(
    Arr.difference(names, kept),
    Effect.forEach((name) => fileSystem.remove(path.join(llama, name), { recursive: true })),
  );
});

/** @internal */
export const keepServerClosure = Effect.fn("closure.keepServerClosure")(function* keepServerClosure(
  directories: Directories,
) {
  yield* moveLicenses(directories);
  yield* flattenLinks(directories.llama);
  yield* keepServer(directories.llama);
});
