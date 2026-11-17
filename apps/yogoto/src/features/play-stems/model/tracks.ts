import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { HttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { runtime } from "#/shared/lib/index.ts";

export type Track = Readonly<{ stem: string; buffer: AudioBuffer; peaks: readonly number[] }>;

const BUCKETS = 800;

const FIRST = 0;

const STEP = 1;

const LOADING_AT_ONCE = 2;

const URL_SEPARATOR = "\n";

/** @internal */
export const context = new AudioContext();

const peakIn = (samples: Float32Array, bucket: number, size: number): number => {
  let peak = FIRST;
  for (const sample of samples.subarray(bucket * size, (bucket + STEP) * size)) {
    peak = Math.max(peak, Math.abs(sample));
  }
  return peak;
};

const peaksOf = (buffer: AudioBuffer): readonly number[] => {
  const size = Math.max(STEP, Math.floor(buffer.length / BUCKETS));
  const channels = Arr.makeBy(buffer.numberOfChannels, (channel) => buffer.getChannelData(channel));
  return Arr.makeBy(BUCKETS, (bucket) =>
    Math.max(
      ...pipe(
        channels,
        Arr.map((samples) => peakIn(samples, bucket, size)),
      ),
    ),
  );
};

const stemOf = (url: string): string =>
  pipe(
    Str.split(url, "/"),
    Arr.last,
    Option.map((name) => pipe(decodeURIComponent(name), Str.split("."), Arr.headNonEmpty)),
    Option.getOrElse(() => url),
  );

const loaded = Effect.fnUntraced(function* loaded(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(url);
  const bytes = yield* response.arrayBuffer;
  const buffer = yield* Effect.promise(() => context.decodeAudioData(bytes));
  const track: Track = { stem: stemOf(url), buffer, peaks: peaksOf(buffer) };
  return track;
});

export const keyOf = (urls: readonly string[]): string => Arr.join(urls, URL_SEPARATOR);

/** @internal */
export const tracksAtom = Atom.family((key: string) =>
  runtime.atom(
    Effect.forEach(Str.split(key, URL_SEPARATOR), loaded, { concurrency: LOADING_AT_ONCE }),
  ),
);
