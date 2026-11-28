import { Array as Arr, Match, Record as Rec, pipe } from "effect";

import type { ZoomInput } from "./zoom.ts";

export type Step =
  | Readonly<{ kind: "wheel"; deltaY: number; count: number; gapMs: number }>
  | Readonly<{ kind: "dblclick" }>
  | Readonly<{ kind: "click"; selector: string }>
  | Readonly<{ kind: "settle" }>;

export type Sequence = Readonly<{ name: string; steps: readonly Step[] }>;

export const POINTER = { x: 900, y: 450 } as const;

export const VIEWPORT = { width: 1400, height: 860 } as const;

export type Scale =
  | Readonly<{ kind: "device"; factor: number }>
  | Readonly<{ kind: "emulated"; factor: number }>;

export const SCALES: readonly Scale[] = [
  { kind: "device", factor: 1 },
  { kind: "device", factor: 3 },
  { kind: "emulated", factor: 3 },
];

export const scaleLabelOf = ({ kind, factor }: Scale): string => `DSF ${factor.toString()} ${kind}`;

const NOTCH = 120;
const FINE = 60;
const NOTCHES = 9;
const FINE_STEPS = 30;
const FAST_GAP_MS = 20;
const SLOW_GAP_MS = 250;
const FRAME_GAP_MS = 16;

const notches = (gapMs: number): Sequence => ({
  name: `wheel ${NOTCHES.toString()}x-${NOTCH.toString()} every ${gapMs.toString()}ms`,
  steps: [{ kind: "wheel", deltaY: -NOTCH, count: NOTCHES, gapMs }],
});

export const SEQUENCES: readonly Sequence[] = [
  notches(FAST_GAP_MS),
  notches(SLOW_GAP_MS),
  {
    name: `wheel ${FINE_STEPS.toString()}x-${FINE.toString()} then ${FINE_STEPS.toString()}x+${FINE.toString()} every ${FRAME_GAP_MS.toString()}ms`,
    steps: [
      { kind: "wheel", deltaY: -FINE, count: FINE_STEPS, gapMs: FRAME_GAP_MS },
      { kind: "wheel", deltaY: FINE, count: FINE_STEPS, gapMs: FRAME_GAP_MS },
    ],
  },
  {
    name: "dblclick, then + and 全体",
    steps: [
      { kind: "dblclick" },
      { kind: "settle" },
      { kind: "click", selector: "#zin" },
      { kind: "settle" },
      { kind: "click", selector: "#zall" },
    ],
  },
];

const BUTTON_INPUTS: Readonly<Record<string, ZoomInput>> = {
  "#zin": { kind: "zoomIn" },
  "#zout": { kind: "zoomOut" },
  "#zall": { kind: "reset" },
};

const inputsOf = (step: Step): readonly ZoomInput[] =>
  Match.value(step).pipe(
    Match.discriminatorsExhaustive("kind")({
      wheel: ({ deltaY, count }): readonly ZoomInput[] =>
        Arr.replicate({ kind: "wheel", deltaY, ctrlKey: false } as const, count),
      dblclick: (): readonly ZoomInput[] => [{ kind: "dblclick" }],
      click: ({ selector }) => pipe(Rec.get(BUTTON_INPUTS, selector), Arr.fromOption),
      settle: () => Arr.empty<ZoomInput>(),
    }),
  );

export const sentInputsOf = (sequence: Sequence): readonly ZoomInput[] =>
  pipe(sequence.steps, Arr.flatMap(inputsOf));
