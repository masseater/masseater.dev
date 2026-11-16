import { Effect, Record as Rec } from "effect";

const MONO = 1;
const FIRST = 0;
const NONE = 0;
const ONE = 1;
const CONCURRENCY = 8;

export type Samples = Readonly<Record<string, Float32Array>>;

export interface SampleRequest<Failure, Requirements> {
  readonly urls: Readonly<Record<string, string>>;
  readonly sampleRate: number;
  readonly onProgress: (share: number) => void;
  readonly fetched: (url: string) => Effect.Effect<ArrayBuffer, Failure, Requirements>;
}

const decoded = (decoder: OfflineAudioContext, bytes: ArrayBuffer): Effect.Effect<Float32Array> =>
  Effect.map(
    Effect.promise(() => decoder.decodeAudioData(bytes)),
    (buffer) => new Float32Array(buffer.getChannelData(FIRST)),
  );

export const loadSamples = Effect.fn("samples.load")(function* loadSamples<Failure, Requirements>({
  urls,
  sampleRate,
  onProgress,
  fetched,
}: SampleRequest<Failure, Requirements>) {
  const entries = Rec.toEntries(urls);
  if (entries.length === NONE) {
    return Rec.empty<string, Float32Array>();
  }
  const decoder = new OfflineAudioContext(MONO, MONO, sampleRate);
  let done = NONE;
  const loaded = yield* Effect.forEach(
    entries,
    ([name, url]) =>
      Effect.gen(function* sample() {
        const bytes = yield* fetched(url);
        const data = yield* decoded(decoder, bytes);
        done += ONE;
        onProgress(done / entries.length);
        return [name, data] as const;
      }),
    { concurrency: CONCURRENCY },
  );
  return Rec.fromEntries(loaded);
});
