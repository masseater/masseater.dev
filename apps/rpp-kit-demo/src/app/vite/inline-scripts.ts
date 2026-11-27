import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Array as Arr, Effect, FileSystem, Layer, Option, Path, String as Str, pipe } from "effect";
import type { Plugin } from "vite-plus";

import { SCRIPT_DIR, externalize } from "./externalize-scripts.ts";

type Target = Readonly<{ outDir: string; base: string }>;

const externalizeFile = Effect.fn("externalizeFile")(function* externalizeFile(
  { outDir, base }: Target,
  file: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const target = path.join(outDir, file);
  const { html, scripts } = yield* externalize({
    html: yield* fileSystem.readFileString(target),
    file,
    base,
  });
  yield* Effect.forEach(
    scripts,
    (script) => fileSystem.writeFileString(path.join(outDir, script.file), script.code),
    { concurrency: 1 },
  );
  yield* fileSystem.writeFileString(target, html);
});

const externalizeAll = Effect.fn("externalizeAll")(function* externalizeAll(
  root: string,
  { outDir, base }: Target,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = path.resolve(root, outDir);
  yield* fileSystem.makeDirectory(path.join(directory, SCRIPT_DIR), { recursive: true });
  const entries = yield* fileSystem.readDirectory(directory, { recursive: true });
  const files = pipe(entries, Arr.filter(Str.endsWith(".html")));
  yield* Effect.forEach(files, (file) => externalizeFile({ outDir: directory, base }, file), {
    concurrency: 1,
  });
});

const runInNode = (root: string, target: Target): Promise<void> =>
  nodeServices.pipe(
    Layer.build,
    Effect.flatMap((context) => Effect.provideContext(externalizeAll(root, target), context)),
    Effect.scoped,
    Effect.runPromise,
  );

export const externalizeInlineScripts = (): Plugin => ({
  name: "externalize-inline-scripts",
  enforce: "post",
  buildApp: {
    order: "post",
    handler: ({ environments }) =>
      Option.match(Option.fromNullishOr(environments["client"]), {
        onNone: () => Promise.resolve(),
        onSome: ({ config }) =>
          runInNode(config.root, { outDir: config.build.outDir, base: config.base }),
      }),
  },
});
