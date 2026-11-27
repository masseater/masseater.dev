import type { Issue, Timeline, VideoScript } from "@masseater.dev/video-kit/script";
import { checkScript, planTimeline } from "@masseater.dev/video-kit/script";
import { Effect, Function as Fn, Option } from "effect";
import type { FileSystem, Path, PlatformError } from "effect";

import { readManifest } from "#/shared/lib/manifest.ts";
import { readDrawn, readScript } from "#/shared/lib/project.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

/** @internal */
export interface Checked {
  readonly script: VideoScript;
  readonly issues: readonly Issue[];
  readonly timelines: readonly Timeline[];
}

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
    const drawn = yield* readDrawn(slug);
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
            tachie: Option.none(),
          },
        }),
      { concurrency: "unbounded" },
    );
    return { script, timelines, issues: checkScript({ script, timelines, drawn }) };
  });
