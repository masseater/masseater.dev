import { Array as Arr, Match, Option, pipe } from "effect";

import type { Bar, Meter, Song, Tempo } from "#/entities/song/song.ts";
import { TICKS_PER_WHOLE, fractionOf } from "#/shared/lib/ticks.ts";
import { isAutomation, isVoiceLine } from "#generated/langium/ast.ts";
import type { Bar as BarNode, VoiceLine } from "#generated/langium/ast.ts";

import { automationOf } from "./automation.ts";
import type { Item } from "./items.ts";
import { STRAIGHT, lineOf } from "./line.ts";
import { meterOf, tempoAfter, tempoOf } from "./meter.ts";
import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";
import { voiceOf } from "./voices.ts";

const NONE = 0;
const FIRST = 1;

export interface PlacedItem {
  readonly item: Item;
  readonly track: string;
  readonly line: number;
  readonly bar: number;
  readonly start: number;
}

export interface BarResult {
  readonly bar: Bar;
  readonly items: readonly PlacedItem[];
  readonly automations: Song["automations"];
}

interface Carry {
  readonly meter: Option.Option<Meter>;
  readonly tempo: Option.Option<Tempo>;
  readonly start: number;
}

interface Where {
  readonly kits: Song["kits"];
  readonly bar: number;
  readonly start: number;
  readonly length: number;
  readonly line: number;
}

interface Settings {
  readonly meter: Meter;
  readonly tempo: Tempo;
}

const lengthProblemsOf =
  (lengths: {
    readonly length: number;
    readonly bar: number;
  }): From<VoiceLine, readonly Problem[]> =>
  (line) => {
    if (lengths.length === lengths.bar) {
      return [];
    }
    const name = Option.match(Option.fromNullishOr(line.track), {
      onNone: () => "master",
      onSome: (track) => track.$refText,
    });
    const gap = fractionOf(Math.abs(lengths.bar - lengths.length));
    const verdict = Match.value(lengths.length < lengths.bar).pipe(
      Match.when(true, () => `${gap} 足りません`),
      Match.orElse(() => `${gap} 多すぎます`),
    );
    return [
      problemAt(line)("events")(
        `${name} の合計は ${fractionOf(lengths.length)} で、この小節の ${fractionOf(lengths.bar)} に ${verdict}`,
      ),
    ];
  };

const placedOf =
  (where: Where): From<VoiceLine, Compiled<readonly PlacedItem[]>> =>
  (line) =>
    Option.match(voiceOf(where.kits)(line), {
      onNone: () => ({ value: [], problems: [] }),
      onSome: ({ track, kind }) => {
        const result = lineOf({ kind, scale: STRAIGHT })(line.events);
        return {
          value: pipe(
            result.value.items,
            Arr.map((item) => ({
              item,
              track,
              line: where.line,
              bar: where.bar,
              start: where.start + item.offset,
            })),
          ),
          problems: [
            ...result.problems,
            ...lengthProblemsOf({ length: result.value.length, bar: where.length })(line),
          ],
        };
      },
    });

const settingsOf =
  (carry: Carry): From<BarNode, Compiled<Option.Option<Settings>>> =>
  (node) => {
    const meter = Option.match(Option.fromNullishOr(node.meter), {
      onNone: () => ({ value: carry.meter, problems: [] }),
      onSome: meterOf,
    });
    const tempo = pipe(
      Option.fromNullishOr(node.tempo),
      Option.map(tempoOf),
      Option.orElse(() => carry.tempo),
    );
    const missing = (property: string, value: Option.Option<unknown>): readonly Problem[] =>
      Option.match(value, {
        onNone: () => [problemAt(node)(property)(`最初の小節には ${property} を書きます`)],
        onSome: () => [],
      });
    return {
      value: Option.all({ meter: meter.value, tempo }),
      problems: [...meter.problems, ...missing("meter", meter.value), ...missing("tempo", tempo)],
    };
  };

const contentOf =
  (where: Omit<Where, "line" | "length">, settings: Settings): From<BarNode, Compiled<BarResult>> =>
  (node) => {
    const length = (TICKS_PER_WHOLE * settings.meter.numerator) / settings.meter.denominator;
    const lines = pipe(
      node.lines,
      Arr.filter(isVoiceLine),
      Arr.map((line, index) => placedOf({ ...where, length, line: index })(line)),
    );
    return {
      value: {
        bar: {
          index: where.bar,
          start: where.start,
          length,
          ...settings,
          section: Option.fromNullishOr(node.section),
          mark: Option.fromNullishOr(node.mark),
        },
        items: pipe(
          lines,
          Arr.flatMap((line) => line.value),
        ),
        automations: pipe(
          node.lines,
          Arr.filter(isAutomation),
          Arr.map(automationOf({ bar: where.bar, start: where.start })),
        ),
      },
      problems: problemsOf(lines),
    };
  };

interface Walk {
  readonly carry: Carry;
  readonly bars: readonly BarResult[];
  readonly problems: readonly Problem[];
}

const START: Walk = {
  carry: { meter: Option.none(), tempo: Option.none(), start: NONE },
  bars: [],
  problems: [],
};

type Step<State, Node> = (state: State, node: Node) => State;

const stepOf =
  (kits: Song["kits"]): Step<Walk, BarNode> =>
  (state, node) => {
    const settings = settingsOf(state.carry)(node);
    return Option.match(settings.value, {
      onNone: () => ({ ...state, problems: [...state.problems, ...settings.problems] }),
      onSome: (barSettings) => {
        const where = { kits, bar: state.bars.length + FIRST, start: state.carry.start };
        const content = contentOf(where, barSettings)(node);
        const { bar } = content.value;
        return {
          carry: {
            meter: Option.some(bar.meter),
            tempo: Option.some(tempoAfter(bar.tempo)),
            start: bar.start + bar.length,
          },
          bars: [...state.bars, content.value],
          problems: [...state.problems, ...settings.problems, ...content.problems],
        };
      },
    });
  };

export const barsOfSong =
  (kits: Song["kits"]): From<readonly BarNode[], Compiled<readonly BarResult[]>> =>
  (nodes) => {
    const walk = Arr.reduce(nodes, START, stepOf(kits));
    return { value: walk.bars, problems: walk.problems };
  };
