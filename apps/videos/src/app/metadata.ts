import type { Format, Tachie, Timeline, VideoScript } from "@masseater.dev/video-kit/script";
import { planTimeline } from "@masseater.dev/video-kit/script";
import { Effect, ManagedRuntime, Option, Record as Rec, Schema, pipe } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";

import { NARRATION_MANIFEST, assetPath, narrationPath } from "#/shared/config/index.ts";
import type { Manifest } from "#/shared/lib/manifest-schema.ts";
import { EMPTY_MANIFEST, ManifestJson } from "#/shared/lib/manifest-schema.ts";
import { tachieArt } from "#/shared/lib/tachie-art.ts";

/** @internal */
export interface VideoProps extends Readonly<Record<string, unknown>> {
  readonly slug: string;
  readonly timelines: readonly Timeline[];
}

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const manifest: Effect.Effect<Manifest, never, HttpClient.HttpClient> = HttpClient.HttpClient.pipe(
  Effect.flatMap((client) => client.get(staticFile(NARRATION_MANIFEST))),
  Effect.flatMap((response) => response.text),
  Effect.flatMap(Schema.decodeEffect(ManifestJson)),
  Effect.orElseSucceed(() => EMPTY_MANIFEST),
);

const tachieOf = (voice: number, found: Manifest["tachie"]): Option.Option<Tachie> => {
  const key = String(voice);
  return pipe(
    Option.fromNullishOr(found),
    Option.flatMap(Rec.get(key)),
    Option.map((entry) => tachieArt({ entry, locate: (path) => staticFile(path) })),
  );
};

const timelineOf = (
  script: VideoScript,
  format: Format,
): Effect.Effect<Timeline, never, HttpClient.HttpClient> =>
  manifest.pipe(
    Effect.flatMap(({ narration, speakers, tachie }) =>
      planTimeline({
        script,
        format,
        sources: {
          narration,
          narrationSrc: (key: string) => staticFile(narrationPath(key)),
          assetSrc: (url: string) => staticFile(assetPath(url)),
          speakerName: Rec.get(speakers, String(script.voice)),
          tachie: tachieOf(script.voice, tachie),
        },
      }),
    ),
  );

/** @internal */
export const metadataFor =
  ({
    script,
    format,
  }: Readonly<{ script: VideoScript; format: Format }>): CalculateMetadataFunction<VideoProps> =>
  ({ props }) =>
    runtime.runPromise(
      timelineOf(script, format).pipe(
        Effect.map((timeline) => ({
          durationInFrames: timeline.durationInFrames,
          width: timeline.width,
          height: timeline.height,
          fps: timeline.fps,
          props: { slug: props.slug, timelines: [timeline] },
        })),
      ),
    );
