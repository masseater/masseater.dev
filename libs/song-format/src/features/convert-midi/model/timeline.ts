import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import { Array as Arr, Match, Option, Order, Record as Rec, pipe } from "effect";
import type { MidiData, MidiEvent } from "midi-file";

import { NO_MIX, sortedByTick } from "#/entities/timeline/index.ts";
import type { Meter, Part, TempoChange, Text, Timed, Timeline } from "#/entities/timeline/index.ts";
import type { From } from "#/shared/lib/from.ts";

import { channelReadOf } from "./channel.ts";
import type { ChannelRead } from "./channel.ts";
import type { PlacedEvent } from "./placed.ts";

const QUARTERS_PER_WHOLE = 4;
const NONE = 0;
const NEXT = 1;

interface Placed {
  readonly tick: number;
  readonly exact: boolean;
  readonly event: MidiEvent;
}

const placedOf =
  (ppq: number): From<readonly MidiEvent[], readonly Placed[]> =>
  (events) => {
    const raw = Arr.scan(events, NONE, (tick, event) => tick + event.deltaTime);
    return pipe(
      events,
      Arr.map((event, index) => {
        const absolute = Option.getOrElse(Arr.get(raw, index + NEXT), () => NONE);
        const exact = (absolute * TICKS_PER_WHOLE) / (ppq * QUARTERS_PER_WHOLE);
        return { tick: Math.round(exact), exact: Number.isInteger(exact), event };
      }),
    );
  };

const channelEventOf: From<Placed, Option.Option<PlacedEvent>> = ({ tick, event }) => {
  if ("channel" in event) {
    return Option.some({ tick, event });
  }
  return Option.none();
};

type TextKind = "name" | "lyric" | "marker";

type KindedText = readonly [TextKind, Text];

interface TrackRead {
  readonly name: Option.Option<string>;
  readonly end: number;
  readonly offGrid: number;
  readonly channels: readonly ChannelRead[];
  readonly texts: Readonly<Record<string, readonly Text[]>>;
  readonly tempos: readonly TempoChange[];
  readonly meters: readonly Meter[];
}

const textOf: From<Placed, Option.Option<KindedText>> = ({ tick, event }) =>
  Match.value(event).pipe(
    Match.when({ type: "trackName" }, (text): Option.Option<KindedText> =>
      Option.some(["name", { tick, text: text.text }]),
    ),
    Match.when({ type: "lyrics" }, (text): Option.Option<KindedText> =>
      Option.some(["lyric", { tick, text: text.text }]),
    ),
    Match.when({ type: "marker" }, (text): Option.Option<KindedText> =>
      Option.some(["marker", { tick, text: text.text }]),
    ),
    Match.orElse(() => Option.none<KindedText>()),
  );

const tempoOf: From<Placed, Option.Option<TempoChange>> = ({ tick, event }) =>
  Match.value(event).pipe(
    Match.when({ type: "setTempo" }, (tempo) =>
      Option.some<TempoChange>({
        tick,
        microseconds: tempo.microsecondsPerBeat,
        target: Option.none(),
      }),
    ),
    Match.orElse(() => Option.none<TempoChange>()),
  );

const meterOf: From<Placed, Option.Option<Meter>> = ({ tick, event }) =>
  Match.value(event).pipe(
    Match.when({ type: "timeSignature" }, (meter) =>
      Option.some<Meter>({ tick, numerator: meter.numerator, denominator: meter.denominator }),
    ),
    Match.orElse(() => Option.none<Meter>()),
  );

const textsOf: From<readonly Placed[], Readonly<Record<string, readonly Text[]>>> = (placed) =>
  pipe(
    placed,
    Arr.map(textOf),
    Arr.getSomes,
    Arr.groupBy(([kind]): string => kind),
    Rec.map((entries) =>
      pipe(
        entries,
        Arr.map(([, text]) => text),
      ),
    ),
  );

const textsIn =
  (kind: TextKind): From<Pick<TrackRead, "texts">, readonly Text[]> =>
  (read) =>
    Option.getOrElse(Rec.get(read.texts, kind), () => []);

const byChannel = Order.mapInput(Order.Number, (read: ChannelRead) => read.channel);

const channelsOf =
  (end: number): From<readonly Placed[], readonly ChannelRead[]> =>
  (placed) => {
    const reads = pipe(
      placed,
      Arr.map(channelEventOf),
      Arr.getSomes,
      Arr.groupBy((item) => String(item.event.channel)),
      Rec.toEntries,
      Arr.map(channelReadOf(end)),
    );
    return Arr.sort(reads, byChannel);
  };

const readTrack =
  (ppq: number): From<readonly MidiEvent[], TrackRead> =>
  (events) => {
    const placed = placedOf(ppq)(events);
    const end = pipe(
      Arr.last(placed),
      Option.match({ onNone: () => NONE, onSome: (last) => last.tick }),
    );
    const texts = textsOf(placed);
    return {
      name: pipe(
        Arr.head(textsIn("name")({ texts })),
        Option.map((text) => text.text),
      ),
      end,
      offGrid: Arr.countBy(placed, (item) => !item.exact),
      channels: channelsOf(end)(placed),
      texts,
      tempos: pipe(placed, Arr.map(tempoOf), Arr.getSomes),
      meters: pipe(placed, Arr.map(meterOf), Arr.getSomes),
    };
  };

const isUsed: From<ChannelRead, boolean> = (read) =>
  Arr.isReadonlyArrayNonEmpty(read.notes) ||
  Arr.isReadonlyArrayNonEmpty(read.controls) ||
  Option.isSome(read.program);

const partsOf = (read: TrackRead, track: number): readonly Part[] => {
  const lyrics = textsIn("lyric")(read);
  return pipe(
    read.channels,
    Arr.filter(isUsed),
    Arr.map((channel) => ({
      ...channel,
      track,
      name: read.name,
      lyrics: pipe(
        lyrics,
        Arr.filter((lyric) =>
          pipe(
            channel.notes,
            Arr.some((note) => note.tick === lyric.tick),
          ),
        ),
      ),
    })),
  );
};

const titleOf: From<readonly TrackRead[], Option.Option<string>> = (reads) =>
  pipe(
    Arr.head(reads),
    Option.filter((read) => !Arr.isReadonlyArrayNonEmpty(read.channels)),
    Option.flatMap((read) => read.name),
  );

const endsOf: From<TrackRead, readonly number[]> = (read) => [
  read.end,
  ...pipe(
    read.channels,
    Arr.flatMap((channel) => channel.notes),
    Arr.map((note) => note.end),
  ),
];

const sortedFrom =
  <Item extends Timed>(
    pick: From<TrackRead, readonly Item[]>,
  ): From<readonly TrackRead[], readonly Item[]> =>
  (reads) =>
    sortedByTick(pipe(reads, Arr.flatMap(pick)));

export const timelineOf: From<MidiData, Timeline> = (midi) => {
  const reads = pipe(midi.tracks, Arr.map(readTrack(midi.header.ticksPerBeat ?? NONE)));
  return {
    title: titleOf(reads),
    end: Arr.reduce(pipe(reads, Arr.flatMap(endsOf)), NONE, (latest, tick) =>
      Math.max(latest, tick),
    ),
    offGrid: Arr.reduce(reads, NONE, (total, read) => total + read.offGrid),
    tempos: sortedFrom((read) => read.tempos)(reads),
    meters: sortedFrom((read) => read.meters)(reads),
    markers: sortedFrom(textsIn("marker"))(reads),
    parts: pipe(
      reads,
      Arr.flatMap((read, index) => partsOf(read, index)),
    ),
    mix: NO_MIX,
  };
};
