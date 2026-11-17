import { Array as Arr, Match, Option, Order, Record as Rec, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { ChannelEvent, PlacedEvent, TimelineControl, TimelineNote } from "./events.ts";

const NONE = 0;
const NEXT = 1;
const DEFAULT_RELEASE = 64;
const DEFAULT_BEND_RANGE = 2;
const CENTS_PER_SEMITONE = 100;
const BEND_HALF = 8192;
const RPN_MSB = 101;
const RPN_LSB = 100;
const DATA_MSB = 6;
const DATA_LSB = 38;
const PITCH_BEND_RPN = 0;
const UNSET = 127;

interface Edge {
  readonly tick: number;
  readonly on: boolean;
  readonly velocity: number;
}

type PitchEdge = readonly [number, Edge];

const edgeOf: From<PlacedEvent, Option.Option<PitchEdge>> = ({ tick, event }) =>
  Match.value(event).pipe(
    Match.when({ type: "noteOn" }, (on): Option.Option<PitchEdge> =>
      Option.some([on.noteNumber, { tick, on: on.velocity > NONE, velocity: on.velocity }]),
    ),
    Match.when({ type: "noteOff" }, (off): Option.Option<PitchEdge> =>
      Option.some([off.noteNumber, { tick, on: false, velocity: off.velocity }]),
    ),
    Match.orElse(() => Option.none<PitchEdge>()),
  );

interface Pairing {
  readonly open: readonly Edge[];
  readonly notes: readonly TimelineNote[];
}

const releaseOf: From<Edge, number> = (edge) => {
  if (edge.velocity === NONE) {
    return DEFAULT_RELEASE;
  }
  return edge.velocity;
};

const START_PAIRING: Pairing = { open: [], notes: [] };

const pairStep =
  (midi: number) =>
  (pairing: Pairing, edge: Edge): Pairing => {
    if (edge.on) {
      return { ...pairing, open: [...pairing.open, edge] };
    }
    return Option.match(Arr.head(pairing.open), {
      onNone: () => pairing,
      onSome: (started) => ({
        open: Arr.drop(pairing.open, NEXT),
        notes: [
          ...pairing.notes,
          {
            tick: started.tick,
            end: edge.tick,
            midi,
            velocity: started.velocity,
            release: releaseOf(edge),
          },
        ],
      }),
    });
  };

const pairedOf =
  (end: number): From<readonly PitchEdge[], readonly TimelineNote[]> =>
  (edges) => {
    const midi = pipe(
      Arr.head(edges),
      Option.match({ onNone: () => NONE, onSome: ([pitch]) => pitch }),
    );
    const steps = pipe(
      edges,
      Arr.map(([, edge]) => edge),
    );
    const paired = Arr.reduce(steps, START_PAIRING, pairStep(midi));
    const unended = pipe(
      paired.open,
      Arr.map((started) => ({
        tick: started.tick,
        end,
        midi,
        velocity: started.velocity,
        release: DEFAULT_RELEASE,
      })),
    );
    return [...paired.notes, ...unended];
  };

const byTickThenPitch = Order.combine(
  Order.mapInput(Order.Number, (note: TimelineNote) => note.tick),
  Order.mapInput(Order.Number, (note: TimelineNote) => note.midi),
);

const notesOf =
  (end: number): From<readonly PlacedEvent[], readonly TimelineNote[]> =>
  (events) => {
    const notes = pipe(
      events,
      Arr.map(edgeOf),
      Arr.getSomes,
      Arr.groupBy(([midi]) => String(midi)),
      Rec.values,
      Arr.flatMap(pairedOf(end)),
    );
    return Arr.sort(notes, byTickThenPitch);
  };

interface Rpn {
  readonly msb: number;
  readonly lsb: number;
  readonly semitones: number;
  readonly cents: number;
}

const START_RPN: Rpn = { msb: UNSET, lsb: UNSET, semitones: DEFAULT_BEND_RANGE, cents: NONE };

const isBendRange: From<Rpn, boolean> = (rpn) =>
  rpn.msb === PITCH_BEND_RPN && rpn.lsb === PITCH_BEND_RPN;

type ControllerEvent = Extract<ChannelEvent, { readonly type: "controller" }>;

const rpnAfter =
  (rpn: Rpn): From<ControllerEvent, Rpn> =>
  ({ controllerType, value }) => {
    if (controllerType === RPN_MSB) {
      return { ...rpn, msb: value };
    }
    if (controllerType === RPN_LSB) {
      return { ...rpn, lsb: value };
    }
    if (isBendRange(rpn) && controllerType === DATA_MSB) {
      return { ...rpn, semitones: value };
    }
    if (isBendRange(rpn) && controllerType === DATA_LSB) {
      return { ...rpn, cents: value };
    }
    return rpn;
  };

const rpnStep: From<readonly [Rpn, PlacedEvent], Rpn> = ([rpn, { event }]) => {
  if (event.type !== "controller") {
    return rpn;
  }
  return rpnAfter(rpn)(event);
};

const controlOf: From<readonly [PlacedEvent, Rpn], Option.Option<TimelineControl>> = ([
  { tick, event },
  rpn,
]) =>
  Match.value(event).pipe(
    Match.when({ type: "controller" }, (cc) =>
      Option.some<TimelineControl>({
        tick,
        controller: { kind: "cc", number: cc.controllerType },
        value: cc.value,
      }),
    ),
    Match.when({ type: "programChange" }, (change) =>
      Option.some<TimelineControl>({
        tick,
        controller: { kind: "program" },
        value: change.programNumber,
      }),
    ),
    Match.when({ type: "channelAftertouch" }, (pressure) =>
      Option.some<TimelineControl>({
        tick,
        controller: { kind: "pressure", midi: Option.none() },
        value: pressure.amount,
      }),
    ),
    Match.when({ type: "noteAftertouch" }, (pressure) =>
      Option.some<TimelineControl>({
        tick,
        controller: { kind: "pressure", midi: Option.some(pressure.noteNumber) },
        value: pressure.amount,
      }),
    ),
    Match.when({ type: "pitchBend" }, (bend) =>
      Option.some<TimelineControl>({
        tick,
        controller: { kind: "bend" },
        value: (bend.value * (rpn.semitones + rpn.cents / CENTS_PER_SEMITONE)) / BEND_HALF,
      }),
    ),
    Match.orElse(() => Option.none<TimelineControl>()),
  );

const controlsOf: From<readonly PlacedEvent[], readonly TimelineControl[]> = (events) =>
  pipe(
    Arr.zip(
      events,
      Arr.scan(events, START_RPN, (rpn, placed) => rpnStep([rpn, placed])),
    ),
    Arr.map(controlOf),
    Arr.getSomes,
  );

export interface ChannelRead {
  readonly channel: number;
  readonly notes: readonly TimelineNote[];
  readonly controls: readonly TimelineControl[];
  readonly program: Option.Option<number>;
}

const isProgram: From<TimelineControl, boolean> = (control) =>
  control.controller.kind === "program";

const initialProgramOf: From<Omit<ChannelRead, "program">, Option.Option<TimelineControl>> = (
  read,
) =>
  pipe(
    Arr.findFirst(read.controls, isProgram),
    Option.filter((program) =>
      pipe(
        Arr.head(read.notes),
        Option.match({ onNone: () => true, onSome: (note) => program.tick <= note.tick }),
      ),
    ),
  );

export const channelReadOf =
  (end: number): From<readonly [string, readonly PlacedEvent[]], ChannelRead> =>
  ([channel, events]) => {
    const read = {
      channel: Number(channel),
      notes: notesOf(end)(events),
      controls: controlsOf(events),
    };
    const program = initialProgramOf(read);
    return {
      ...read,
      program: pipe(
        program,
        Option.map((control) => control.value),
      ),
      controls: Option.match(program, {
        onNone: () => read.controls,
        onSome: (first) =>
          pipe(
            read.controls,
            Arr.filter((control) => control !== first),
          ),
      }),
    };
  };
