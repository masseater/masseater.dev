import type { Issue, Script, Timeline } from "@masseater.dev/video-kit/script";
import { checkScript, planTimeline } from "@masseater.dev/video-kit/script";
import { Array as Arr, Effect, FileSystem, Function as Fn, Option, Path, pipe } from "effect";
import type { PlatformError } from "effect";

import { readManifest } from "#/shared/lib/manifest.ts";
import { projectPaths, readScript } from "#/shared/lib/project.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

/** @internal */
export interface Checked {
  readonly script: Script;
  readonly issues: readonly Issue[];
  readonly timelines: readonly Timeline[];
}

const mediaOf = ({ scenes }: Script): readonly string[] =>
  pipe(
    scenes,
    Arr.flatMap((scene) => {
      if (scene.kind === "media") {
        return [scene.src];
      }
      return [];
    }),
  );

const presentOf = (
  script: Script,
): Effect.Effect<
  ReadonlySet<string>,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* present() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    const found = yield* Effect.filter(
      mediaOf(script),
      (src) => fileSystem.exists(path.join(paths.public, src)),
      {
        concurrency: "unbounded",
      },
    );
    return new Set(found);
  });

/** @internal */
export const checkVideo = (
  slug: string,
): Effect.Effect<
  Checked,
  VideoError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* check() {
    const script = yield* readScript(slug);
    const { narration } = yield* readManifest;
    const timelines = yield* Effect.forEach(
      script.formats,
      (format) =>
        planTimeline({
          script,
          format,
          sources: {
            narration,
            narrationSrc: Fn.identity,
            assetSrc: Fn.identity,
            speakerName: Option.none(),
          },
        }),
      { concurrency: "unbounded" },
    );
    const present = yield* presentOf(script);
    return {
      script,
      timelines,
      issues: checkScript({ script, timelines, assetExists: (src) => present.has(src) }),
    };
  });
