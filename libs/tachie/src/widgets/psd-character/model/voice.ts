import type { MediaUtilsAudioData } from "@remotion/media-utils";
import { Array as Arr, Option, pipe } from "effect";

import type { Phoneme } from "#/entities/phonemes/index.ts";
import type { Speech } from "#/features/move-mouth/index.ts";

export interface Voice {
  readonly from: number;
  readonly phonemes?: readonly Phoneme[];
  readonly audio?: string;
}

const NONE = 0;

const lastEnd = (phonemes: readonly Phoneme[]): number =>
  pipe(
    Arr.last(phonemes),
    Option.map(({ end }) => end),
    Option.getOrElse(() => NONE),
  );

const lengthOf = (voice: Voice, fps: number, audio: Option.Option<MediaUtilsAudioData>): number => {
  const spoken = lastEnd(voice.phonemes ?? []);
  const heard = pipe(
    audio,
    Option.map(({ durationInSeconds }) => durationInSeconds),
    Option.getOrElse(() => NONE),
  );
  return Math.ceil(Math.max(spoken, heard) * fps);
};

export const speechAt = ({
  voices,
  frame,
  fps,
  audio,
}: Readonly<{
  voices: readonly Voice[];
  frame: number;
  fps: number;
  audio: ReadonlyMap<string, MediaUtilsAudioData>;
}>): Option.Option<Speech> =>
  pipe(
    voices,
    Arr.map((voice) => ({
      voice,
      audio: pipe(
        Option.fromNullishOr(voice.audio),
        Option.flatMap((src) => Option.fromNullishOr(audio.get(src))),
      ),
    })),
    Arr.findLast(
      ({ voice, audio: heard }) =>
        voice.from <= frame && frame < voice.from + lengthOf(voice, fps, heard),
    ),
    Option.map(({ voice, audio: heard }) => ({
      frame: frame - voice.from,
      fps,
      phonemes: voice.phonemes ?? [],
      audio: heard,
    })),
  );
