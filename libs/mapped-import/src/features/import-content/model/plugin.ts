import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, ManagedRuntime, Option, String as Str, pipe } from "effect";
import type { Plugin } from "vite-plus";

export type Source = Readonly<{
  id: string;
  content: string;
  read: (path: string) => Effect.Effect<string, unknown>;
}>;

export type Loaded = Readonly<{
  code: string;
  declaration: Option.Option<string>;
  watchFiles: readonly string[];
}>;

export type ContentImport = Readonly<{
  name: string;
  extension: string;
  load: (source: Source) => Effect.Effect<Loaded>;
}>;

const escaped = (value: string): string =>
  pipe(value, Str.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`));

const extensionPattern = (extension: string): RegExp => new RegExp(`${escaped(extension)}$`, "iu");

export const declarationPathOf =
  (extension: string) =>
  (id: string): string =>
    pipe(id, Str.replace(extensionPattern(extension), `.d${extension}.ts`));

const writeIfChanged = Effect.fn("writeIfChanged")(function* writeIfChanged(
  path: string,
  code: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const current = yield* fileSystem.readFileString(path).pipe(Effect.orElseSucceed(() => ""));
  if (current !== code) {
    yield* fileSystem.writeFileString(path, code).pipe(Effect.orDie);
  }
});

const runtime = ManagedRuntime.make(NodeServices.layer);

export const contentImport = ({ name, extension, load }: ContentImport): Plugin => {
  const pattern = extensionPattern(extension);
  const declarationPath = declarationPathOf(extension);
  const loaded = Effect.fn("contentImport.load")(function* loadSource(id: string, content: string) {
    const fileSystem = yield* FileSystem.FileSystem;
    const result = yield* load({ id, content, read: (path) => fileSystem.readFileString(path) });
    yield* Option.match(result.declaration, {
      onNone: () => Effect.void,
      onSome: (code) => writeIfChanged(declarationPath(id), code),
    });
    return result;
  });
  return {
    name,
    transform: {
      filter: { id: pattern },
      handler(content, id) {
        return runtime.runPromise(
          loaded(id, content).pipe(
            Effect.map(({ code, watchFiles }) => {
              for (const file of watchFiles) {
                this.addWatchFile(file);
              }
              return { code };
            }),
          ),
        );
      },
    },
    configureVitest: ({ defineCacheKeyGenerator }) => {
      defineCacheKeyGenerator(({ id }) => {
        if (pattern.test(id)) {
          return false;
        }
        return "";
      });
    },
  };
};
