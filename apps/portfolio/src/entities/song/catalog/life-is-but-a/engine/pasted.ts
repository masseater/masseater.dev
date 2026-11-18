import { semitoneRatio } from "@masseater.dev/fumx-studio/dsp/number";
import { fade, resample } from "@masseater.dev/fumx-studio/dsp/sampling";
import { stretch } from "@masseater.dev/fumx-studio/dsp/stretch";
import { fieldOf } from "@masseater.dev/fumx-studio/studio/field";
import { secondsOf, timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import type { Length } from "@masseater.dev/fumx-studio/studio/moment";
import type { Source } from "@masseater.dev/fumx-studio/studio/paste";
import { Match, Predicate } from "effect";

import type { Life } from "./context.ts";
import type { Event } from "./score-schema.ts";
import { wordOf } from "./words.ts";

export type Pasted = Extract<Event, Readonly<{ kind: "paste" }>>;

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
