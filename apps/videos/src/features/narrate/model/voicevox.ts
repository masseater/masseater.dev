import { Timing } from "@masseater.dev/video-kit/script";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import type { Config } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { VOICEVOX_URL } from "#/shared/config/index.ts";
import { failedWith, videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

const PRE_PHONEME_SECONDS = 0.05;
const POST_PHONEME_SECONDS = 0.1;

const Style = Schema.Struct({ id: Schema.Finite, name: Schema.String });

const Speaker = Schema.Struct({ name: Schema.String, styles: Schema.Array(Style) });

const Speakers = Schema.Array(Speaker);

const AudioQuery = Schema.Record(Schema.String, Schema.Unknown);

const okClient: Effect.Effect<HttpClient.HttpClient, never, HttpClient.HttpClient> =
  HttpClient.HttpClient.pipe(Effect.map(HttpClient.filterStatusOk));

/** @internal */
export const speakerName = (
  style: number,
): Effect.Effect<string, VideoError | Config.ConfigError, HttpClient.HttpClient> =>
  Effect.gen(function* speaker() {
    const engine = yield* VOICEVOX_URL;
    const client = yield* okClient;
    const speakers = yield* client
      .get(`${engine}/speakers`)
      .pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Speakers)),
        Effect.mapError(failedWith),
      );
    const found = pipe(
      speakers,
      Arr.findFirst(({ styles }) =>
        pipe(
          styles,
          Arr.some(({ id }) => id === style),
        ),
      ),
    );
    if (Option.isNone(found)) {
      return yield* videoError(`VOICEVOX に話者 ${String(style)} がない`);
    }
    return found.value.name;
  });

/** @internal */
export interface Utterance {
  readonly style: number;
  readonly text: string;
}

/** @internal */
export const synthesize = ({
  style,
  text,
}: Utterance): Effect.Effect<Uint8Array, VideoError | Config.ConfigError, HttpClient.HttpClient> =>
  Effect.gen(function* synthesizeLine() {
    const engine = yield* VOICEVOX_URL;
    const client = yield* okClient;
    const speaker = String(style);
    const query = yield* HttpClientRequest.post(`${engine}/audio_query`).pipe(
      HttpClientRequest.setUrlParams({ text, speaker }),
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(AudioQuery)),
      Effect.mapError(failedWith),
    );
    const request = yield* HttpClientRequest.post(`${engine}/synthesis`).pipe(
      HttpClientRequest.setUrlParams({ speaker }),
      HttpClientRequest.bodyJson({
        ...query,
        speedScale: Timing.SPEED_SCALE,
        prePhonemeLength: PRE_PHONEME_SECONDS,
        postPhonemeLength: POST_PHONEME_SECONDS,
      }),
      Effect.mapError(failedWith),
    );
    const response = yield* client.execute(request).pipe(Effect.mapError(failedWith));
    const buffer = yield* response.arrayBuffer.pipe(Effect.mapError(failedWith));
    return new Uint8Array(buffer);
  });
