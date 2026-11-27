import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { AudioQuerySchema, phonemesFromAudioQuery } from "./audio-query.ts";

const ENGINE_FRAMES_PER_SECOND = 93.75;

const QUERY = String.raw`{
  "accent_phrases": [
    {
      "moras": [
        { "text": "コ", "consonant": "k", "consonant_length": 0.064, "vowel": "o", "vowel_length": 0.128, "pitch": 5.5 },
        { "text": "ン", "consonant": null, "consonant_length": null, "vowel": "N", "vowel_length": 0.096, "pitch": 5.4 }
      ],
      "accent": 1,
      "pause_mora": { "text": "、", "vowel": "pau", "vowel_length": 0.3, "pitch": 0 },
      "is_interrogative": true
    },
    {
      "moras": [
        { "text": "ネ", "consonant": "n", "consonant_length": 0.04, "vowel": "e", "vowel_length": 0.08, "pitch": 0 }
      ],
      "accent": 1
    }
  ],
  "speedScale": 2,
  "pitchScale": 0,
  "intonationScale": 1,
  "volumeScale": 1,
  "prePhonemeLength": 0.1,
  "postPhonemeLength": 0.1,
  "pauseLength": null,
  "pauseLengthScale": 2,
  "outputSamplingRate": 24000,
  "outputStereo": false,
  "kana": "コン？、ネ"
}`;

const frameOf = (seconds: number): number => Math.round(seconds * ENGINE_FRAMES_PER_SECOND);

describe("phonemesFromAudioQuery", () => {
  it.effect("lays out the phonemes on the engine's frames", () =>
    Effect.gen(function* layOut() {
      const query = yield* Schema.decodeEffect(Schema.fromJsonString(AudioQuerySchema))(QUERY);
      const frames = pipe(
        phonemesFromAudioQuery(query),
        Arr.map(({ phoneme, start, end }) => ({ phoneme, from: frameOf(start), to: frameOf(end) })),
      );
      expect(frames).toStrictEqual([
        { phoneme: "pau", from: 0, to: 5 },
        { phoneme: "k", from: 5, to: 8 },
        { phoneme: "o", from: 8, to: 14 },
        { phoneme: "N", from: 14, to: 18 },
        { phoneme: "N", from: 18, to: 25 },
        { phoneme: "pau", from: 25, to: 53 },
        { phoneme: "n", from: 53, to: 55 },
        { phoneme: "e", from: 55, to: 59 },
        { phoneme: "pau", from: 59, to: 64 },
      ]);
    }),
  );
});
