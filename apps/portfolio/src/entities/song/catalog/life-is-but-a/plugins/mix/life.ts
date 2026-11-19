import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import type { MixRequest, MixedStem, PlayedEvent } from "@masseater.dev/fumx-studio/plugin/plugin";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { studioOf } from "@masseater.dev/fumx-studio/studio/studio";
import type { Session as StudioSession } from "@masseater.dev/fumx-studio/studio/studio";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  flagIn,
  numberIn,
  textIn,
} from "#/entities/song/catalog/life-is-but-a/plugins/lib/args.ts";

import type { Life, Sink, Times } from "./context.ts";
import { sweepOf } from "./sweep.ts";

const SECONDS_PER_BAR_AT_ONE_BPM = 240;
const CONTROL_RATE = 16;
const SPARE = 2;
const RESTING_CUTOFF = 160;
const NONE = 0;
const STRAIGHT = 0.5;
const WORDS = " ";

const trackOf = (name: string): string => pipe(name, Str.toLowerCase, Str.replaceAll(" ", "-"));

export interface Session {
  readonly life: Life;
  readonly stems: readonly MixedStem[];
  readonly play: (stage: string) => void;
}

const tempoOf = ({ song }: MixRequest): number =>
  pipe(Arr.head(song.bars), Option.match({ onNone: () => NONE, onSome: (bar) => bar.tempo.bpm }));

const studioSessionOf = (request: MixRequest): Omit<StudioSession, "log"> => {
  const tempo = tempoOf(request);
  const tail = Option.getOrElse(request.song.tailSeconds, () => NONE);
  return {
    samples: request.samples,
    table: {},
    seconds: (request.song.bars.length * SECONDS_PER_BAR_AT_ONE_BPM) / tempo + tail,
    tempo,
    swing: Option.match(request.song.groove, {
      onNone: () => STRAIGHT,
      onSome: (groove) => groove.amount,
    }),
    labelOf: () => ({}),
    quiet: (): boolean => false,
  };
};

const impulseOf =
  (request: MixRequest) =>
  (name: string): Float32Array => {
    const path = textIn(request.args)(name);
    return pipe(
      path,
      Option.flatMap((found) => Option.fromUndefinedOr(request.samples[found])),
      Option.getOrElse(() => new Float32Array()),
    );
  };

const busIn =
  (request: MixRequest) =>
  (name: string): Bus => {
    const found = Option.fromUndefinedOr(request.buses.get(trackOf(name)));
    return Option.getOrThrowWith(found, () => new RangeError(`no track ${name}`));
  };

const sweepIn =
  (life: Life) =>
  (event: PlayedEvent): void => {
    const number = (name: string): number =>
      Option.getOrElse(numberIn(event.args)(name), () => NONE);
    const duration = event.placement.duration ?? NONE;
    Option.map(numberIn(event.args)("sweep"), (shape) => {
      sweepOf(life)({
        shape,
        amount: number("amount"),
        period: number("period"),
        from: Math.round(event.time * SAMPLE_RATE),
        to: Math.round((event.time + duration) * SAMPLE_RATE),
        duration,
      });
    });
  };

const stageOf =
  (request: MixRequest) =>
  (stage: string): readonly string[] =>
    pipe(
      textIn(request.args)(stage),
      Option.map(Str.split(WORDS)),
      Option.getOrElse((): readonly string[] => []),
    );

interface Outputs {
  readonly kicks: Times;
  readonly tape: Sink;
}

const lifeIn = (request: MixRequest, { kicks, tape }: Outputs): Life => {
  const session = studioSessionOf(request);
  const studio = studioOf({ ...session, log: Option.some(request.log) });
  const controls = Math.ceil(studio.frames / CONTROL_RATE) + SPARE;
  return {
    studio,
    quiet: studioOf({ ...session, log: Option.none() }),
    grid: studio.grid,
    rack: { get: busIn(request) },
    kicks,
    cutoffs: new Float32Array(controls).fill(RESTING_CUTOFF),
    impulses: { left: impulseOf(request)("plate-left"), right: impulseOf(request)("plate-right") },
    tape: Option.some(tape),
  };
};

export const lifeOf = (request: MixRequest): Session => {
  const kicks: number[] = [];
  const stems: MixedStem[] = [];
  const life = lifeIn(request, {
    kicks: { all: () => kicks },
    tape: {
      write: (name, left, right) => {
        stems.push({ name: trackOf(name), left, right });
      },
    },
  });
  const heard = (event: PlayedEvent): void => {
    if (flagIn(event.args)("duck")) {
      kicks.push(event.time);
    }
    sweepIn(life)(event);
  };
  return {
    life,
    stems,
    play: (stage) => {
      for (const name of stageOf(request)(stage)) {
        for (const event of request.play(name)) {
          heard(event);
        }
      }
    },
  };
};
