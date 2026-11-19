import { Array as Arr, Option, Order, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import { cellsText, pitchText, quoted, restsOf, shareText } from "./cells.ts";
import type { Cell } from "./cells.ts";
import type { Group, Line } from "./groups.ts";
import { endOfSpan } from "./layout.ts";
import type { Span } from "./layout.ts";
import type { Plan, PlannedPart } from "./plan.ts";

const FULL = 127;
const DEFAULT_RELEASE = 64;
const SINGLE = 1;

interface Segment {
  readonly group: Group;
  readonly start: number;
  readonly end: number;
}

interface VoiceText {
  readonly text: string;
  readonly continues: boolean;
}

const touches =
  (bar: Span): From<Group, boolean> =>
  (group) => {
    if (group.end === group.start) {
      return group.start >= bar.start && group.start < endOfSpan(bar);
    }
    return group.start < endOfSpan(bar) && group.end > bar.start;
  };

const segmentOf =
  (bar: Span): From<Group, Segment> =>
  (group) => ({
    group,
    start: Math.max(group.start, bar.start),
    end: Math.min(group.end, endOfSpan(bar)),
  });

const pitchesText: From<readonly number[], string> = (midis) => {
  if (midis.length === SINGLE) {
    return Arr.join(pipe(midis, Arr.map(pitchText)), "");
  }
  return `[${Arr.join(pipe(midis, Arr.map(pitchText)), " ")}]`;
};

const headOf =
  (voices: Option.Option<ReadonlyMap<number, string>>): From<Group, string> =>
  (group) =>
    Option.match(voices, {
      onNone: () => pitchesText(group.midis),
      onSome: (map) =>
        pipe(
          Arr.head(group.midis),
          Option.flatMap((midi) => Option.fromNullishOr(map.get(midi))),
          Option.getOrElse(() => ""),
        ),
    });

const when = (condition: boolean, text: string): readonly string[] => {
  if (condition) {
    return [text];
  }
  return [];
};

const attributesOf: From<Segment, readonly string[]> = ({ group, start, end }) => {
  const last = end === group.end;
  return [
    ...when(group.velocity !== FULL, `vel ${shareText(group.velocity)}`),
    ...when(last && group.release !== DEFAULT_RELEASE, `off ${shareText(group.release)}`),
    ...when(!last, "tie"),
    ...pipe(
      group.lyric,
      Option.filter(() => start === group.start),
      Option.map((text) => `lyric ${quoted(text)}`),
      Option.toArray,
    ),
  ];
};

const cellsOf = (
  segments: readonly Segment[],
  bar: Span,
  head: From<Group, string>,
): readonly Cell[] => {
  const placed = Arr.reduce(
    segments,
    { cells: [] as readonly Cell[], cursor: bar.start },
    ({ cells, cursor }, segment) => ({
      cells: [
        ...cells,
        ...restsOf(segment.start - cursor),
        {
          head: head(segment.group),
          attributes: attributesOf(segment),
          length: segment.end - segment.start,
        },
      ],
      cursor: segment.end,
    }),
  );
  return [...placed.cells, ...restsOf(endOfSpan(bar) - placed.cursor)];
};

const lineTextOf =
  (
    planned: PlannedPart,
    voices: Option.Option<ReadonlyMap<number, string>>,
    bar: Span,
  ): From<Line, Option.Option<VoiceText>> =>
  (line) => {
    const segments = pipe(line, Arr.filter(touches(bar)), Arr.map(segmentOf(bar)));
    return pipe(
      Arr.head(segments),
      Option.map((first) => ({
        text: `${planned.name}: ${cellsText(cellsOf(segments, bar, headOf(voices)))}`,
        continues: first.start > first.group.start,
      })),
    );
  };

const continuedFirst = Order.mapInput(Order.Boolean, (voice: VoiceText) => !voice.continues);

export interface VoiceContext {
  readonly plan: Plan;
  readonly bar: Span;
}

export const voiceLinesOf: From<VoiceContext, From<PlannedPart, readonly string[]>> =
  ({ plan, bar }) =>
  (planned) => {
    const voices = pipe(
      Option.some(plan.drumVoices),
      Option.filter(() => planned.source.kind === "kit"),
    );
    const texts = pipe(planned.lines, Arr.map(lineTextOf(planned, voices, bar)), Arr.getSomes);
    return pipe(
      Arr.sort(texts, continuedFirst),
      Arr.map((voice) => voice.text),
    );
  };
