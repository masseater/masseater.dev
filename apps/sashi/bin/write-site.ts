#!/usr/bin/env node
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { ReferenceSchema, referencesOf } from "@masseater.dev/sashi";
import type { Reference } from "@masseater.dev/sashi";
import type { PlatformError } from "effect";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { pageHeaders, pagesOf } from "#/features/write-site/index.ts";
import type { Page } from "#/features/write-site/index.ts";
import { CONTENT_DIR, OUTDIR, REFERENCES_FILE } from "#/shared/config/index.ts";

const STYLE = "style.css";
const STYLE_SOURCE = new URL("../public/style.css", import.meta.url);
const HEADERS_FILE = "_headers";
const INDEX = "index.html";

const Shelf = Schema.Struct({ references: Schema.Array(ReferenceSchema) });

const encodeShelf = Schema.encodeEffect(Schema.fromJsonString(Shelf));

const decodeJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const readShelf: Effect.Effect<readonly Reference[], never, FileSystem.FileSystem | Path.Path> =
  Effect.gen(function* readShelf() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const names = yield* fileSystem
      .readDirectory(CONTENT_DIR)
      .pipe(
        Effect.when(fileSystem.exists(CONTENT_DIR)),
        Effect.map(Option.getOrElse((): readonly string[] => [])),
      );
    const jsonNames = pipe(names, Arr.filter(Str.endsWith(".json")));
    const files = yield* Effect.forEach(
      jsonNames,
      (name) =>
        fileSystem.readFileString(path.join(CONTENT_DIR, name)).pipe(
          Effect.flatMap(decodeJson),
          Effect.map((content): readonly [string, unknown] => [name, content]),
        ),
      { concurrency: 1 },
    );
    return yield* referencesOf(Rec.fromEntries(files));
  }).pipe(Effect.orDie);

const writePage = ({
  path: page,
  html,
}: Page): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* writeOnePage() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = path.join(OUTDIR, page);
    yield* fileSystem.makeDirectory(directory, { recursive: true });
    yield* fileSystem.writeFileString(path.join(directory, INDEX), html);
  });

const program = Effect.gen(function* writeSite() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const references = yield* readShelf;
  yield* fileSystem.remove(OUTDIR, { recursive: true, force: true });
  yield* Effect.forEach(pagesOf(references), writePage, { concurrency: 1 });
  const style = yield* path.fromFileUrl(STYLE_SOURCE);
  yield* fileSystem.copyFile(style, path.join(OUTDIR, STYLE));
  yield* fileSystem.writeFileString(path.join(OUTDIR, HEADERS_FILE), pageHeaders);
  const body = yield* encodeShelf({ references });
  yield* fileSystem.writeFileString(path.join(OUTDIR, REFERENCES_FILE), body);
}).pipe(Effect.orDie);

runMain(
  nodeServices.pipe(
    Layer.build,
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  ),
);
