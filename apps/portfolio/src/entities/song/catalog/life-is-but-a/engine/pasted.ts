import { Match, Predicate } from "effect";

import { semitoneRatio } from "#/entities/song/lib/dsp/number.ts";
import { fade, resample } from "#/entities/song/lib/dsp/sampling.ts";
import { stretch } from "#/entities/song/lib/dsp/stretch.ts";
import { fieldOf } from "#/entities/song/lib/studio/field.ts";
import { secondsOf, timeOf } from "#/entities/song/lib/studio/moment.ts";
import type { Length } from "#/entities/song/lib/studio/moment.ts";
import type { Source } from "#/entities/song/lib/studio/paste.ts";

import type { Life } from "./context.ts";
import type { Event } from "./score-schema.ts";
import { wordOf } from "./words.ts";

type Pasted = Extract<Event, Readonly<{ kind: "paste" }>>;

const SPOKEN = {
  name: "spoken",
  source: "v_f2_say",
  semitones: -1,
  ratio: 1.25,
  grain: 0.05,
  fade: { fadeIn: 0.01, fadeOut: 0.05 },
};

const spokenOf = (life: Life): Float32Array => {
  const cached = life.words.get(SPOKEN.name);
  if (Predicate.isNotUndefined(cached)) {
    return cached;
  }
  const said = resample({ rate: semitoneRatio(SPOKEN.semitones) })(
    life.samples[SPOKEN.source] ?? new Float32Array(),
  );
  const spoken = fade(SPOKEN.fade)(
    new Float32Array(stretch({ ratio: SPOKEN.ratio, grain: SPOKEN.grain, mode: "akai" })(said)),
  );
  life.labelled(spoken, { name: SPOKEN.name });
  life.words.set(SPOKEN.name, spoken);
  return spoken;
};

const sourceOf = (life: Life, source: Pasted["source"]): Source =>
  Match.value(source).pipe(
    Match.when(Match.string, (name) => name),
    Match.when({ word: Match.any }, ({ word }) =>
      wordOf(life)({
        syllable: word.syllable,
        key: word.key,
        seconds: word.seconds,
        ...fieldOf("mode")(word.mode),
      }),
    ),
    Match.orElse(() => spokenOf(life)),
  );

const durationOf = (life: Life, length?: Length): Partial<Readonly<{ duration: number }>> => {
  if (Predicate.isUndefined(length)) {
    return {};
  }
  return { duration: secondsOf(life.grid)(length) };
};

export const pasted =
  (life: Life) =>
  ({ bus, source, at, placement: { length, ...placement } }: Pasted): void => {
    life.studio.paste({
      bus: life.rack.get(bus),
      source: sourceOf(life, source),
      time: timeOf(life.grid)(at),
      placement: {
        ...placement,
        ...durationOf(life, length),
      },
    });
  };
