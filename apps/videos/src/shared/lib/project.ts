import { pathToFileURL } from "node:url";

import type { VideoScript } from "@masseater.dev/video-kit/script";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect";

import { ScriptModule } from "./script-schema.ts";
import { failedWith } from "./video-error.ts";
import type { VideoError } from "./video-error.ts";

export interface ProjectPaths {
  readonly root: string;
  readonly public: string;
  readonly out: string;
}

const ROOT_FROM_HERE = "../../..";
const DRAWN = /^ {2}(?<id>[\w-]+|"[^"]+"): \(/gmu;
const QUOTE = /"/gu;

/** @internal */
export const projectPaths: Effect.Effect<ProjectPaths, never, Path.Path> = Effect.gen(
  function* paths() {
    const path = yield* Path.Path;
    const root = path.resolve(import.meta.dirname, ROOT_FROM_HERE);
    return { root, public: path.join(root, "public"), out: path.join(root, "out") };
  },
);

/** @internal */
export const videoFile = ({
  slug,
  name,
}: Readonly<{ slug: string; name: "script.ts" | "video.tsx" }>): Effect.Effect<
  string,
  never,
  Path.Path
> =>
  Effect.gen(function* file() {
    const path = yield* Path.Path;
    const { root } = yield* projectPaths;
    return path.join(root, "src/pages", slug, name);
  });

/** @internal */
export const readScript = (slug: string): Effect.Effect<VideoScript, VideoError, Path.Path> =>
  Effect.gen(function* read() {
    const file = yield* videoFile({ slug, name: "script.ts" });
    const loaded: unknown = yield* Effect.tryPromise({
      try: (): Promise<unknown> => import(pathToFileURL(file).href),
      catch: failedWith,
    });
    const { script } = yield* Schema.decodeUnknownEffect(ScriptModule)(loaded).pipe(
      Effect.mapError(failedWith),
    );
    return script;
  });

/** @internal */
export const readDrawn = (
  slug: string,
): Effect.Effect<
  readonly string[],
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* read() {
    const fileSystem = yield* FileSystem.FileSystem;
    const file = yield* videoFile({ slug, name: "video.tsx" });
    const source = yield* fileSystem.readFileString(file);
    return pipe(
      source,
      Str.matchAll(DRAWN),
      Arr.fromIterable,
      Arr.flatMap((match) => Option.toArray(Option.fromNullishOr(match.groups))),
      Arr.flatMap((groups) => Option.toArray(Option.fromNullishOr(groups["id"]))),
      Arr.map(Str.replaceAll(QUOTE, "")),
    );
  });
