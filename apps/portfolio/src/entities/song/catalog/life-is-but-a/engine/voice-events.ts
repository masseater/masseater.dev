import { secondsOf, timeOf } from "#/entities/song/lib/studio/moment.ts";
import type { At, Length } from "#/entities/song/lib/studio/moment.ts";

import { choir } from "./choir.ts";
import type { Life } from "./context.ts";
import { dream, mosaic } from "./ensemble.ts";
import { lead } from "./lines.ts";
import type { Event } from "./score-schema.ts";
import { chop, say } from "./voices.ts";

type Of<Kind extends Event["kind"]> = Extract<Event, Readonly<{ kind: Kind }>>;

const voicedOf =
  (life: Life) =>
  <
    Spec extends Readonly<{
      at: At;
      length: Length;
    }>,
  >({
    at,
    length,
    ...rest
  }: Spec): Omit<Spec, "at" | "length"> & Readonly<{ time: number; seconds: number }> => ({
    ...rest,
    time: timeOf(life.grid)(at),
    seconds: secondsOf(life.grid)(length),
  });

export const voiceEvents = (
  life: Life,
): Readonly<{
  chop: (event: Of<"chop">) => void;
  say: (event: Of<"say">) => void;
  choir: (event: Of<"choir">) => void;
  lead: ReturnType<typeof lead>;
  dream: (event: Of<"dream">) => void;
  mosaic: ReturnType<typeof mosaic>;
}> => ({
  chop: (event) => {
    chop(life)(voicedOf(life)(event));
  },
  say: (event) => {
    say(life)(voicedOf(life)(event));
  },
  choir: (event) => {
    choir(life)(voicedOf(life)(event));
  },
  lead: lead(life),
  dream: ({ bar, step, length, ...rest }) => {
    dream(life)({
      ...rest,
      time: life.grid.at(bar, step),
      seconds: secondsOf(life.grid)(length),
    });
  },
  mosaic: mosaic(life),
});
