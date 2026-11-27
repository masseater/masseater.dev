import { Effect, Record as Rec, String as Str } from "effect";

import { NOTHING, Timing } from "#/shared/config/index.ts";
import { plainOf, segmentsOf } from "#/shared/lib/segment.ts";

import type { VideoScript } from "./cut.ts";

const KEY_LENGTH = 24;
const HASH = "SHA-256";

export const spokenOf = ({
  say,
  readings,
}: Readonly<{ say: string; readings: VideoScript["readings"] }>): string => {
  let spoken = plainOf(segmentsOf(say));
  for (const [word, reading] of Rec.toEntries(readings)) {
    spoken = Str.replaceAll(word, reading)(spoken);
  }
  return spoken;
};

export const narrationKey = ({
  speaker,
  spoken,
}: Readonly<{ speaker: number; spoken: string }>): Effect.Effect<string> =>
  Effect.promise(() =>
    crypto.subtle.digest(
      HASH,
      new TextEncoder().encode(`${String(speaker)}\n${String(Timing.SPEED_SCALE)}\n${spoken}`),
    ),
  ).pipe(Effect.map((buffer) => Str.slice(NOTHING, KEY_LENGTH)(new Uint8Array(buffer).toHex())));

export type Narration = Readonly<Record<string, Readonly<{ seconds: number }>>>;
