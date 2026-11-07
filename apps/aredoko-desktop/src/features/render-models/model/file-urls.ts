import { Array, Effect, HashMap, Option, String, pipe } from "effect";
import type { Scope } from "effect";
import { LoadingManager } from "three";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";

interface ModelFile {
  readonly name: string;
  readonly data: Uint8Array;
}

const TGA = /\.tga$/iu;
const INLINE = /^(?:data|blob):/u;
const WHITE_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=";

const decodeUrl = Option.liftThrowable(decodeURIComponent);

const baseName = (name: string): string =>
  pipe(
    name,
    String.split(/[\\/]/u),
    Array.last,
    Option.getOrElse(() => name),
    String.toLowerCase,
  );

const blobUrl = (data: Uint8Array): string =>
  URL.createObjectURL(new Blob([Uint8Array.from(data)]));

const urlsOf = (files: readonly ModelFile[]): HashMap.HashMap<string, string> =>
  pipe(
    files,
    Array.map(({ name, data }) => [baseName(name), blobUrl(data)] as const),
    HashMap.fromIterable,
  );

const stemOf = (name: string): string => pipe(name, String.replace(/\.[^.]+$/u, ""));

const similarIn = (urls: HashMap.HashMap<string, string>, name: string): Option.Option<string> =>
  pipe(
    HashMap.toEntries(urls),
    Array.findFirst(([candidate]) => pipe(stemOf(candidate), String.startsWith(stemOf(name)))),
    Option.map(([, url]) => url),
  );

const resolverOf =
  (urls: HashMap.HashMap<string, string>) =>
  (url: string): string => {
    if (INLINE.test(url)) {
      return url;
    }
    const name = pipe(
      decodeUrl(url),
      Option.getOrElse(() => url),
      baseName,
    );
    return pipe(
      HashMap.get(urls, name),
      Option.orElse(() => similarIn(urls, name)),
      Option.getOrElse(() => WHITE_PIXEL),
    );
  };

const revoke = (urls: HashMap.HashMap<string, string>): Effect.Effect<void> =>
  pipe(
    HashMap.values(urls),
    Effect.forEach((url) =>
      Effect.sync(() => {
        URL.revokeObjectURL(url);
      }),
    ),
    Effect.asVoid,
  );

const managerFor = (
  files: readonly ModelFile[],
): Effect.Effect<LoadingManager, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => urlsOf(files)),
    revoke,
  ).pipe(
    Effect.map((urls) => {
      const manager = new LoadingManager();
      manager.setURLModifier(resolverOf(urls));
      manager.addHandler(TGA, new TGALoader(manager));
      return manager;
    }),
  );

export { baseName, managerFor };
export type { ModelFile };
