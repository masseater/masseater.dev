import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { Level, Part, Timeline, TimelineControl, TrackMix } from "./events.ts";
import { DRUMS, FIRST_DRUM, PROGRAMS } from "./general-midi.ts";
import { groupsOf, isDrumPart, linesOf } from "./groups.ts";
import type { Line } from "./groups.ts";
import { nameFrom, uniqueAmong } from "./names.ts";

const NONE = 0;
const NEXT = 1;
const SHARED = 1;
const DEFAULT_PROGRAM = 0;

export type Source =
  | { readonly kind: "instrument"; readonly instrument: string; readonly program: number }
  | { readonly kind: "kit" };

export interface PlannedPart {
  readonly part: Part;
  readonly name: string;
  readonly source: Source;
  readonly lines: readonly Line[];
  readonly controls: readonly TimelineControl[];
  readonly mix: TrackMix;
}

export interface PlannedBus {
  readonly name: string;
  readonly level: Level;
}

export interface Plan {
  readonly parts: readonly PlannedPart[];
  readonly buses: readonly PlannedBus[];
  readonly instruments: ReadonlyMap<number, string>;
  readonly drumVoices: ReadonlyMap<number, string>;
}

const drumNameOf: From<number, string> = (midi) =>
  Option.getOrElse(Arr.get(DRUMS, midi - FIRST_DRUM), () => `note-${String(midi)}`);

const programNameOf: From<number, string> = (program) =>
  Option.getOrElse(Arr.get(PROGRAMS, program), () => `program-${String(program)}`);

export const controllerKeyOf: From<Pick<TimelineControl, "controller">, string> = ({
  controller,
}) => {
  if (controller.kind === "cc") {
    return `cc ${String(controller.number)}`;
  }
  if (controller.kind === "pressure") {
    return Option.match(controller.midi, {
      onNone: () => "pressure",
      onSome: (midi) => `pressure ${String(midi)}`,
    });
  }
  return controller.kind;
};

const isLastAtTick: From<readonly TimelineControl[], From<number, boolean>> =
  (controls) => (index) =>
    pipe(
      Option.all([Arr.get(controls, index), Arr.get(controls, index + NEXT)]),
      Option.match({
        onNone: () => true,
        onSome: ([control, next]) =>
          next.tick !== control.tick || controllerKeyOf(next) !== controllerKeyOf(control),
      }),
    );

const byControllerThenTick = Order.combine(
  Order.mapInput(Order.String, controllerKeyOf),
  Order.mapInput(Order.Number, (control: TimelineControl) => control.tick),
);

const controlsOf: From<Part, readonly TimelineControl[]> = (part) => {
  const drumProgram = pipe(
    part.program,
    Option.filter(() => isDrumPart(part)),
    Option.map((value): TimelineControl => ({
      tick: NONE,
      controller: { kind: "program" },
      value,
    })),
    Option.toArray,
  );
  const sorted = Arr.sort([...drumProgram, ...part.controls], byControllerThenTick);
  return pipe(
    sorted,
    Arr.filter((_control, index) => isLastAtTick(sorted)(index)),
  );
};

const programOf: From<Part, number> = (part) =>
  Option.getOrElse(part.program, () => DEFAULT_PROGRAM);

const labelOf: From<Part, string> = (part) => Option.getOrElse(part.name, () => "");

const instrumentsOf: From<readonly Part[], ReadonlyMap<number, string>> = (parts) =>
  new Map(
    pipe(
      parts,
      Arr.filter((part) => !isDrumPart(part)),
      Arr.map(programOf),
      Arr.dedupe,
      Arr.map((program) => [program, nameFrom([programNameOf(program)])] as const),
    ),
  );

const drumVoicesOf: From<readonly Part[], ReadonlyMap<number, string>> = (parts) => {
  const midis = pipe(
    parts,
    Arr.filter(isDrumPart),
    Arr.flatMap((part) => part.notes),
    Arr.map((note) => note.midi),
    Arr.dedupe,
  );
  return new Map(
    pipe(
      Arr.sort(midis, Order.Number),
      Arr.map((midi) => [midi, drumNameOf(midi)] as const),
    ),
  );
};

const channelledOf: From<ReadonlySet<string>, From<Part, string>> = (shared) => (part) => {
  const label = labelOf(part);
  if (shared.has(label)) {
    return `${label} ch${String(part.channel + NEXT)}`;
  }
  return label;
};

const fallbackOf: From<Part, string> = (part) => {
  if (isDrumPart(part)) {
    return "drums";
  }
  return programNameOf(programOf(part));
};

const candidatesOf: From<ReadonlySet<string>, From<Part, readonly string[]>> =
  (shared) => (part) => [
    channelledOf(shared)(part),
    fallbackOf(part),
    `track ${String(part.track)}`,
  ];

const sharedLabelsOf: From<readonly Part[], ReadonlySet<string>> = (parts) =>
  new Set(
    pipe(
      parts,
      Arr.groupBy(labelOf),
      Rec.filter((same) => same.length > SHARED),
      Rec.keys,
    ),
  );

const sourceOf: From<ReadonlyMap<number, string>, From<Part, Source>> = (instruments) => (part) => {
  if (isDrumPart(part)) {
    return { kind: "kit" };
  }
  const program = programOf(part);
  return { kind: "instrument", instrument: instruments.get(program) ?? "", program };
};

const namesOf: From<readonly PlannedPart[], ReadonlySet<string>> = (planned) =>
  new Set(
    pipe(
      planned,
      Arr.map((done) => done.name),
    ),
  );

interface Naming {
  readonly instruments: Plan["instruments"];
  readonly candidates: From<Part, readonly string[]>;
  readonly mixes: Timeline["mix"]["tracks"];
}

const UNMIXED: TrackMix = {
  level: { decibels: NONE, pan: NONE, muted: false },
  sends: [],
  envelopes: [],
};

type Reducer<State, Item> = (state: State, item: Item) => State;

const NO_PARTS: readonly PlannedPart[] = [];

const nextPart: From<Naming, Reducer<readonly PlannedPart[], Part>> =
  (naming) => (planned, part) => {
    const name = uniqueAmong(namesOf(planned))(nameFrom(naming.candidates(part)));
    return Arr.append(planned, {
      part,
      name,
      source: sourceOf(naming.instruments)(part),
      lines: linesOf(groupsOf(part)),
      controls: controlsOf(part),
      mix: naming.mixes.get(part.track) ?? UNMIXED,
    });
  };

type BusNaming = Readonly<{ taken: ReadonlySet<string>; buses: Timeline["mix"]["buses"] }>;

const busesOf: From<BusNaming, readonly PlannedBus[]> = ({ taken, buses }) => {
  const used = new Set(taken);
  const named: PlannedBus[] = [];
  for (const [index, bus] of buses.entries()) {
    const name = uniqueAmong(used)(
      nameFrom([...Option.toArray(bus.name), `bus ${String(index + NEXT)}`]),
    );
    used.add(name);
    named.push({ name, level: bus.level });
  }
  return named;
};

export const planOf: From<Timeline, Plan> = (timeline) => {
  const instruments = instrumentsOf(timeline.parts);
  const candidates = candidatesOf(sharedLabelsOf(timeline.parts));
  const parts = Arr.reduce(
    timeline.parts,
    NO_PARTS,
    nextPart({ instruments, candidates, mixes: timeline.mix.tracks }),
  );
  return {
    parts,
    buses: busesOf({ taken: namesOf(parts), buses: timeline.mix.buses }),
    instruments,
    drumVoices: drumVoicesOf(timeline.parts),
  };
};
