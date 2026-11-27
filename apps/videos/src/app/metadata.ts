import type { Format, ScriptError, Timeline } from "@masseater.dev/video-kit/script";
import { parseScript, planTimeline } from "@masseater.dev/video-kit/script";
import { Effect, ManagedRuntime, Option, Record as Rec, Schema, pipe } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";

import { NARRATION_MANIFEST, assetPath, narrationPath } from "#/shared/config/index.ts";
import type { Manifest } from "#/shared/lib/manifest-schema.ts";
import { EMPTY_MANIFEST, ManifestJson } from "#/shared/lib/manifest-schema.ts";

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

const speakerOf = (
  voice: Option.Option<number>,
  speakers: Manifest["speakers"],
): Option.Option<string> =>
  pipe(
    voice,
    Option.flatMap((style) => Rec.get(speakers, String(style))),
  );

const timelineOf = (
  markdown: string,
  format: Format,
): Effect.Effect<Timeline, ScriptError, HttpClient.HttpClient> =>
  Effect.gen(function* plan() {
    const script = yield* parseScript(markdown);
    const { narration, speakers } = yield* manifest;
    const voice = Option.liftPredicate(script, (value) => "voice" in value).pipe(
      Option.flatMap((value) => Option.fromNullishOr(value.voice)),
    );
    return yield* planTimeline({
      script,
      format,
      sources: {
        narration,
        narrationSrc: (key: string) => staticFile(narrationPath(key)),
        assetSrc: (url: string) => staticFile(assetPath(url)),
        speakerName: speakerOf(voice, speakers),
      },
    });
  });

/** @internal */
export const metadataFor =
  ({
    markdown,
    format,
  }: Readonly<{ markdown: string; format: Format }>): CalculateMetadataFunction<VideoProps> =>
  ({ props }) =>
    runtime.runPromise(
      timelineOf(markdown, format).pipe(
        Effect.map((timeline) => ({
          durationInFrames: timeline.durationInFrames,
          width: timeline.width,
          height: timeline.height,
          fps: timeline.fps,
          props: { slug: props.slug, timelines: [timeline] },
        })),
      ),
    );
