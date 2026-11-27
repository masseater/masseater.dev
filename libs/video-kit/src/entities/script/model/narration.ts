import { Effect, Record as Rec, String as Str } from "effect";

import { NOTHING, Timing } from "#/shared/config/index.ts";

import type { Line, Script } from "./script.ts";
import { textOf } from "./script.ts";

const KEY_LENGTH = 24;
const HASH = "SHA-256";

export const spokenOf = ({
  line,
  readings,
}: Readonly<{ line: Line; readings: Script["readings"] }>): string => {
  let spoken = textOf(line);
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
