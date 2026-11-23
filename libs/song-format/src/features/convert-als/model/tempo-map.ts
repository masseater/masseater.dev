import { decodeTimeSignatureId } from "ableton-als";
import { Array as Arr, Option, Order, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { AlsMaster, AutomationEvent, LiveSet, Parameter } from "./live-set.ts";

export const SONG_START = 0;
const SECONDS_PER_MINUTE = 60;

export interface Point {
  readonly beat: number;
  readonly value: number;
}

export interface TempoSegment {
  readonly beat: number;
  readonly bpm: number;
  readonly target: Option.Option<number>;
}

export interface MeterChange {
  readonly beat: number;
  readonly numerator: number;
  readonly denominator: number;
}

export interface Locator {
  readonly beat: number;
  readonly name: string;
}

const masterOf: From<LiveSet, Option.Option<AlsMaster>> = (liveSet) =>
  Option.orElse(Option.fromUndefinedOr(liveSet.MasterTrack), () =>
    Option.fromUndefinedOr(liveSet.MainTrack),
  );

const mixerOf: From<
  AlsMaster,
  Option.Option<{ readonly Tempo: Parameter; readonly TimeSignature: Parameter }>
> = (master) =>
  Option.orElse(Option.fromUndefinedOr(master.DeviceChain?.Mixer), () =>
    Option.fromUndefinedOr(master.MasterChain?.Mixer),
  );

const eventsOf = (events: {
  readonly FloatEvent?: readonly AutomationEvent[];
  readonly EnumEvent?: readonly AutomationEvent[];
  readonly BoolEvent?: readonly AutomationEvent[];
}): readonly AutomationEvent[] => [
  ...(events.FloatEvent ?? []),
  ...(events.EnumEvent ?? []),
  ...(events.BoolEvent ?? []),
];

const byTime = Order.mapInput(Order.Number, (event: AutomationEvent) => event.Time);

export const envelopeOf =
  (master: AlsMaster): From<Parameter, readonly AutomationEvent[]> =>
  (parameter) => {
    const inline = Option.fromUndefinedOr(parameter.ArrangerAutomation?.Events);
    const pointed = pipe(
      Option.fromUndefinedOr(parameter.AutomationTarget),
      Option.flatMap((target) =>
        Arr.findFirst(
          master.AutomationEnvelopes?.Envelopes.AutomationEnvelope ?? [],
          (envelope) => envelope.EnvelopeTarget.PointeeId.Value === target.Id,
        ),
      ),
      Option.map((envelope) => envelope.Automation.Events),
    );
    return pipe(
      Option.orElse(pointed, () => inline),
      Option.map(eventsOf),
      Option.getOrElse((): readonly AutomationEvent[] => []),
      Arr.sort(byTime),
    );
  };

const SINGLE = 1;

const tempoOf: From<
  LiveSet,
  Option.Option<{ readonly master: AlsMaster; readonly tempo: Parameter }>
> = (liveSet) =>
  pipe(
    masterOf(liveSet),
    Option.flatMap((master) =>
      pipe(
        mixerOf(master),
        Option.map((mixer) => ({ master, tempo: mixer.Tempo })),
      ),
    ),
  );

export const tempoEnvelopeOf: From<LiveSet, readonly Point[]> = (liveSet) =>
  pipe(
    tempoOf(liveSet),
    Option.map(({ master, tempo }) =>
      Arr.map(envelopeOf(master)(tempo), (event): Point => ({
        beat: event.Time,
        value: Number(event.Value),
      })),
    ),
    Option.getOrElse((): readonly Point[] => []),
  );

export const tempoPointsOf: From<LiveSet, readonly Point[]> = (liveSet) => {
  const envelope = tempoEnvelopeOf(liveSet);
  if (envelope.length > SINGLE) {
    return envelope;
  }
  return pipe(
    tempoOf(liveSet),
    Option.flatMap(({ tempo }) => Option.fromUndefinedOr(tempo.Manual)),
    Option.map((manual): readonly Point[] => [{ beat: SONG_START, value: manual.Value }]),
    Option.getOrElse(() => envelope),
  );
};

const valueAt =
  (from: Point, to: Point): From<number, number> =>
  (beat) => {
    if (to.beat === from.beat) {
      return to.value;
    }
    return from.value + ((to.value - from.value) * (beat - from.beat)) / (to.beat - from.beat);
  };

const segmentOf = (from: Point, next: Option.Option<Point>): TempoSegment => {
  const start = Math.max(from.beat, SONG_START);
  return Option.match(next, {
    onNone: () => ({ beat: start, bpm: from.value, target: Option.none() }),
    onSome: (to) => {
      const bpm = valueAt(from, to)(start);
      if (to.beat <= start || to.value === bpm) {
        return { beat: start, bpm, target: Option.none() };
      }
      return { beat: start, bpm, target: Option.some(to.value) };
    },
  });
};

export const tempoSegmentsOf: From<readonly Point[], readonly TempoSegment[]> = (points) =>
  pipe(
    points,
    Arr.map((point, index) => ({ point, next: Arr.get(points, index + 1) })),
    Arr.filter(({ next }) =>
      Option.match(next, { onNone: () => true, onSome: (to) => to.beat > SONG_START }),
    ),
    Arr.map(({ point, next }) => segmentOf(point, next)),
    Arr.reduce([] as readonly TempoSegment[], (kept, segment) => {
      const kept2 = pipe(
        Arr.last(kept),
        Option.filter((last) => last.beat === segment.beat),
        Option.match({ onNone: () => kept, onSome: () => Arr.dropRight(kept, 1) }),
      );
      const redundant = pipe(
        Arr.last(kept2),
        Option.exists(
          (last) =>
            Option.isNone(last.target) && Option.isNone(segment.target) && last.bpm === segment.bpm,
        ),
      );
      return redundant ? kept2 : [...kept2, segment];
    }),
  );

export const secondsAt =
  (segments: readonly TempoSegment[]): From<number, number> =>
  (beat) =>
    pipe(
      segments,
      Arr.map((segment, index) => {
        const nextBeat = Option.getOrElse(
          Option.map(Arr.get(segments, index + 1), (next) => next.beat),
          () => Number.POSITIVE_INFINITY,
        );
        if (beat <= segment.beat) {
          return 0;
        }
        const end = Math.min(beat, nextBeat);
        return Option.match(segment.target, {
          onNone: () => (SECONDS_PER_MINUTE * (end - segment.beat)) / segment.bpm,
          onSome: (target) => {
            const slope = (target - segment.bpm) / (nextBeat - segment.beat);
            const reached = segment.bpm + slope * (end - segment.beat);
            return (SECONDS_PER_MINUTE / slope) * Math.log(reached / segment.bpm);
          },
        });
      }),
      Arr.reduce(0, (sum, seconds) => sum + seconds),
    );

const meterOfId = (beat: number, id: number): Option.Option<MeterChange> =>
  pipe(
    Option.fromNullishOr(decodeTimeSignatureId(id)),
    Option.map((signature) => ({
      beat: Math.max(beat, SONG_START),
      numerator: signature.num,
      denominator: signature.den,
    })),
  );

export const metersOf: From<LiveSet, readonly MeterChange[]> = (liveSet) =>
  pipe(
    masterOf(liveSet),
    Option.flatMap((master) =>
      pipe(
        mixerOf(master),
        Option.map((mixer) => {
          const events = envelopeOf(master)(mixer.TimeSignature);
          const manual = Option.fromUndefinedOr(mixer.TimeSignature.Manual);
          if (events.length > SINGLE || Option.isNone(manual)) {
            return pipe(
              events,
              Arr.map((event) => meterOfId(event.Time, Number(event.Value))),
              Arr.getSomes,
              Arr.reverse,
              Arr.dedupeAdjacentWith((later, earlier) => later.beat === earlier.beat),
              Arr.reverse,
            );
          }
          return Option.toArray(meterOfId(SONG_START, manual.value.Value));
        }),
      ),
    ),
    Option.getOrElse((): readonly MeterChange[] => []),
  );

const byBeat = Order.mapInput(Order.Number, (locator: Locator) => locator.beat);

export const locatorsOf: From<LiveSet, readonly Locator[]> = (liveSet) =>
  pipe(
    liveSet.Locators?.Locators.Locator ?? [],
    Arr.map((locator): Locator => ({ beat: locator.Time.Value, name: locator.Name.Value })),
    Arr.sort(byBeat),
  );
