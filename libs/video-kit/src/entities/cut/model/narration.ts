import { Array as Arr, Effect, Order, Record as Rec, String as Str, pipe } from "effect";

import { NOTHING, Timing } from "#/shared/config/index.ts";
import { readOf } from "#/shared/lib/ruby.ts";
import { plainOf, segmentsOf } from "#/shared/lib/segment.ts";

import type { VideoScript } from "./cut.ts";
import { unpartedOf } from "./cut.ts";

const KEY_LENGTH = 24;
const SPACE = " ";

const lengthOf = ([word]: readonly [string, string]): number => word.length;
const HASH = "SHA-256";

export const spokenOf = ({
  say,
  readings,
}: Readonly<{ say: string; readings: VideoScript["readings"] }>): string => {
  const read = readOf(say);
  let spoken = plainOf(segmentsOf(unpartedOf(read)));
  for (const [word, reading] of pipe(
    Rec.toEntries(readings),
    Arr.sortWith(lengthOf, Order.flip(Order.Number)),
  )) {
    spoken = Str.replaceAll(word, reading)(spoken);
  }
  return Str.replaceAll(SPACE, Str.empty)(spoken);
};

const NO_BEATS: readonly number[] = [];
const LINE = "\n";

const keyText = ({
  speaker,
  spoken,
  speed,
  beats,
}: Readonly<{
  speaker: number;
  spoken: string;
  speed: number;
  beats: readonly number[];
}>): string => {
  const head = [String(speaker), String(speed), spoken];
  return pipe(beats, Arr.map(String), Arr.prependAll(head), Arr.join(LINE));
};

export const narrationKey = ({
  speaker,
  spoken,
  speed = Timing.SPEED_SCALE,
  beats = NO_BEATS,
}: Readonly<{
  speaker: number;
  spoken: string;
  speed?: number;
  beats?: readonly number[];
}>): Effect.Effect<string> =>
  Effect.promise(() =>
    crypto.subtle.digest(
      HASH,
      new TextEncoder().encode(keyText({ speaker, spoken, speed, beats })),
    ),
  ).pipe(Effect.map((buffer) => Str.slice(NOTHING, KEY_LENGTH)(new Uint8Array(buffer).toHex())));

export type Narration = Readonly<Record<string, Readonly<{ seconds: number; lead?: number }>>>;
