import { Match } from "effect";

import arrangement from "#/entities/song/catalog/life-is-but-a/score/arrangement.json";
import { scoreOf } from "#/entities/song/lib/studio/score.ts";

import type { Life } from "./context.ts";
import { rhythmEvents } from "./rhythm-events.ts";
import { ArrangementSchema } from "./score-schema.ts";
import type { Event } from "./score-schema.ts";
import { tonalEvents } from "./tonal-events.ts";
import { voiceEvents } from "./voice-events.ts";

const SCORE = scoreOf(ArrangementSchema)("arrangement", arrangement);

const playerOf = (life: Life): ((event: Event) => void) =>
  Match.type<Event>().pipe(
    Match.discriminatorsExhaustive("kind")({
      ...rhythmEvents(life),
      ...tonalEvents(life),
      ...voiceEvents(life),
    }),
  );

export const playStage =
  (life: Life) =>
  (stage: string): void => {
    const play = playerOf(life);
    for (const event of SCORE[stage] ?? []) {
      play(event);
    }
  };
