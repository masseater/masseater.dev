import { Effect, Option, String as Str, pipe } from "effect";
import type { Plugin } from "vite-plus";

import { catalogOf } from "./catalog-markdown.ts";

const QUERY = "?technique-catalog";
const PREFIX = "\0technique-catalog:";

type Resolve = (source: string) => Promise<Readonly<{ id: string }> | null>;

type Read = (path: string) => Promise<Uint8Array>;

const resolveCatalog = (resolve: Resolve, source: string): Promise<string | undefined> =>
  Effect.runPromise(
    Effect.promise(() => resolve(Str.replace(QUERY, "")(source))).pipe(
      Effect.map((resolved) =>
        pipe(
          Option.fromNullishOr(resolved),
          Option.map(({ id }) => `${PREFIX}${id}`),
          Option.getOrUndefined,
        ),
      ),
    ),
  );

const loadCatalog = (read: Read, path: string): Promise<string> =>
  Effect.runPromise(
    Effect.promise(() => read(path)).pipe(
      Effect.map((bytes) => catalogOf(new TextDecoder().decode(bytes))),
      Effect.map((items) => `export default ${JSON.stringify(items)};`),
    ),
  );

const techniqueCatalog = (): Plugin => ({
  name: "technique-catalog",
  enforce: "pre",
  resolveId(source, importer) {
    return pipe(
      Option.liftPredicate(source, Str.endsWith(QUERY)),
      Option.map((found) =>
        resolveCatalog((file) => this.resolve(file, importer, { skipSelf: true }), found),
      ),
      Option.getOrUndefined,
    );
  },
  load(id) {
    const { fs } = this;
    return pipe(
      Option.liftPredicate(id, Str.startsWith(PREFIX)),
      Option.map((resolved) => Str.replace(PREFIX, "")(resolved)),
      Option.map((path) => {
        this.addWatchFile(path);
        return loadCatalog((file) => fs.readFile(file), path);
      }),
      Option.getOrUndefined,
    );
  },
});

export { techniqueCatalog };
