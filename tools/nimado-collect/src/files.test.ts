import { NodeServices } from "@effect/platform-node";
import { Effect, Exit, FileSystem, Path, Schema, String as Str } from "effect";
import { expect, it } from "vite-plus/test";

import { readJson, writeJson } from "./files.ts";

const Names = Schema.Struct({ names: Schema.Array(Schema.String) });

const BEFORE = { names: ["前の値"] };
const AFTER = { names: ["新しい値", "さらに新しい値"] };
const START = 0;
const HALF = 2;
const FILE = "names.json";

const firstHalf = (text: string): string => {
  const end = Math.floor(text.length / HALF);
  return Str.slice(START, end)(text);
};

const stoppingHalfway = (fileSystem: FileSystem.FileSystem): FileSystem.FileSystem => ({
  ...fileSystem,
  writeFileString: (file, text) =>
    Effect.andThen(
      fileSystem.writeFileString(file, firstHalf(text)),
      Effect.die("書き込みの途中で止まった"),
    ),
});

const inDirectory = <Value, Failure>(
  run: (directory: string) => Effect.Effect<Value, Failure, FileSystem.FileSystem | Path.Path>,
): Promise<Value> =>
  Effect.runPromise(
    Effect.gen(function* withDirectory() {
      const fileSystem = yield* FileSystem.FileSystem;
      const directory = yield* fileSystem.makeTempDirectoryScoped();
      return yield* run(directory);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

it("書き込みが途中で止まっても、前のファイルを壊さない", () =>
  expect(
    inDirectory((directory) =>
      Effect.gen(function* interruptedWrite() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = path.join(directory, FILE);
        yield* writeJson({ codec: Names, file, value: BEFORE });
        const exit = yield* writeJson({ codec: Names, file, value: AFTER }).pipe(
          Effect.provideService(FileSystem.FileSystem, stoppingHalfway(fileSystem)),
          Effect.exit,
        );
        const stored = yield* readJson({ codec: Names, file });
        return { failed: Exit.isFailure(exit), stored };
      }),
    ),
  ).resolves.toMatchObject({ failed: true, stored: { value: BEFORE } }));

it("無いフォルダを作って書き、前の値を置き換え、ほかのファイルを残さない", () =>
  expect(
    inDirectory((directory) =>
      Effect.gen(function* replaces() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const folder = path.join(directory, "nested");
        const file = path.join(folder, FILE);
        yield* writeJson({ codec: Names, file, value: BEFORE });
        yield* writeJson({ codec: Names, file, value: AFTER });
        const stored = yield* readJson({ codec: Names, file });
        const files = yield* fileSystem.readDirectory(folder);
        return { files, stored };
      }),
    ),
  ).resolves.toMatchObject({ files: [FILE], stored: { value: AFTER } }));
