import { Array as Arr, Effect, Order, Record as Rec, String as Str, pipe } from "effect";

import { NOTHING, Timing } from "#/shared/config/index.ts";
import { plainOf, segmentsOf } from "#/shared/lib/segment.ts";

import type { VideoScript } from "./cut.ts";

const KEY_LENGTH = 24;
const SPACE = " ";

const lengthOf = ([word]: readonly [string, string]): number => word.length;
const HASH = "SHA-256";

export const spokenOf = ({
  say,
  readings,
}: Readonly<{ say: string; readings: VideoScript["readings"] }>): string => {
  let spoken = plainOf(segmentsOf(say));
  for (const [word, reading] of pipe(
    Rec.toEntries(readings),
    Arr.sortWith(lengthOf, Order.flip(Order.Number)),
  )) {
    spoken = Str.replaceAll(word, reading)(spoken);
  }
  return Str.replaceAll(SPACE, Str.empty)(spoken);
};

export const narrationKey = ({
  speaker,
  spoken,
  speed = Timing.SPEED_SCALE,
}: Readonly<{ speaker: number; spoken: string; speed?: number }>): Effect.Effect<string> =>
  Effect.promise(() =>
    crypto.subtle.digest(
      HASH,
      new TextEncoder().encode(`${String(speaker)}\n${String(speed)}\n${spoken}`),
    ),
  ).pipe(Effect.map((buffer) => Str.slice(NOTHING, KEY_LENGTH)(new Uint8Array(buffer).toHex())));

export type Narration = Readonly<Record<string, Readonly<{ seconds: number }>>>;
