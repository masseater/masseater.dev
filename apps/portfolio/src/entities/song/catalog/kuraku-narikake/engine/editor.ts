import { Match } from "effect";

import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { loggedEdit } from "#/entities/song/lib/studio/edits.ts";
import { timeOf } from "#/entities/song/lib/studio/moment.ts";
import { mute } from "#/entities/song/lib/studio/mute.ts";
import type { Studio } from "#/entities/song/lib/studio/studio.ts";

import type { Kuraku } from "./kuraku.ts";
import { looped } from "./loop.ts";
import type { CueEdit } from "./score-schema.ts";

const MUTE_FADE = 3e-3;
const NO_PITCH = 0;
const LOOP_LABEL = "loop, halving";

export interface Editing {
  readonly kuraku: Kuraku;
  readonly studio: Studio;
  readonly bus: Bus;
}

export const editorOf = ({ kuraku, studio, bus }: Editing): ((edit: CueEdit) => void) => {
  const time = timeOf(kuraku.grid);
  return Match.type<CueEdit>().pipe(
    Match.discriminatorsExhaustive("kind")({
      mute: ({ at, seconds }) => {
        mute(studio.desk)({ bus, time: time(at), seconds, fade: MUTE_FADE });
      },
      reverse: ({ at, seconds }) => {
        studio.reverse({ bus, time: time(at), seconds });
      },
      tapeStop: ({ at, seconds, endRate }) => {
        studio.tapeStop({ bus, time: time(at), seconds, endRate });
      },
      repeat: ({ at, seconds, count, semitones }) => {
        studio.repeat({ bus, time: time(at), seconds, count, pitch: semitones ?? NO_PITCH });
      },
      loop: (loop) => {
        if (studio === kuraku.editor) {
          loggedEdit(studio.desk)({
            label: LOOP_LABEL,
            time: time(loop.to),
            seconds: kuraku.grid.bar,
          });
          return;
        }
        looped({ bus, loop })(kuraku);
      },
    }),
  );
};
