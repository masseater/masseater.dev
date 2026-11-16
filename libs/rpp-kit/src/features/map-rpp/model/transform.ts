import { NodeServices } from "@effect/platform-node";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Path, pipe } from "effect";
import { mappedOutput } from "mapped-import/mapper";
import type { Request } from "mapped-import/mapper";
import type { TransformResult } from "ts-content-mapper";

import { parseRpp, outlineSong, segmentsOf } from "#/entities/song/index.ts";
import type { Param } from "#/entities/song/index.ts";

const NEVER_SONG = "export declare const song: never;\n";

const missingFiles = Effect.fn("missingFiles")(function* missingFiles(
  fileName: string,
  files: readonly Param[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const base = path.dirname(fileName);
  return yield* pipe(
    files,
    Effect.filter((file) =>
      Effect.map(fileSystem.exists(path.resolve(base, file.text)), (exists) => !exists),
    ),
  );
});

const transformRpp = Effect.fn("transformRpp")(function* transformRpp(request: Request) {
  const parsed = parseRpp(request.content);
  if (parsed.status === "error") {
    return mappedOutput({
      request,
      mapped: { status: "error", fallback: NEVER_SONG, issues: [parsed.error] },
    });
  }
  const outline = outlineSong(parsed.root);
  const missing = yield* missingFiles(request.fileName, outline.files);
  return mappedOutput({
    request,
    mapped: {
      status: "ok",
      segments: segmentsOf({ outline, missing: Arr.fromIterable(missing) }),
    },
  });
});

const runtime = ManagedRuntime.make(NodeServices.layer);

export const transform = (request: Request): Promise<TransformResult> =>
  runtime.runPromise(transformRpp(request));
