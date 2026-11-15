import { Array as Arr, pipe } from "effect";

import { make, withAttributes } from "./dom.ts";

const div = make("div");
const span = make("span");
const canvas = make("canvas");

const WAVE_SIZE = { width: "1600", height: "240" } as const;
const SPECTRUM_SIZE = { width: "1600", height: "112" } as const;

const CLASS = {
  title:
    "m-0 font-display text-[clamp(40px,11vw,104px)] leading-[0.92] font-extrabold tracking-[-0.045em]",
  cursor: "ml-[0.12em] inline-block h-[0.09em] w-[0.62em] bg-hot align-[0.05em]",
  facts: "my-3.5 flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-dim",
  transport: "sticky top-0 z-20 bg-paper pt-2.5",
  row: "flex min-w-0 items-center gap-3.5 max-sm:gap-2.5",
  play: "daw-play grid size-[52px] flex-none cursor-pointer place-items-center rounded-full border-0 bg-hot text-white transition-transform duration-100 active:scale-[0.94] motion-reduce:transition-none",
  icon: "daw-icon block size-[22px] bg-current",
  time: "flex-none text-[22px] leading-[1.1] tracking-[-0.02em] tabular-nums max-sm:text-[19px]",
  total: "text-[13px] text-dim",
  position: "min-w-[4.6em] flex-none text-[13px] text-dim tabular-nums",
  section: "ml-auto min-w-0 truncate text-right text-[13px] text-dim",
  progress: "group mt-2.5 h-[3px] overflow-hidden bg-line data-[done=true]:h-px",
  progressFill:
    "block h-full w-0 bg-hot transition-[width] duration-150 group-data-[done=true]:hidden motion-reduce:transition-none",
  deck: "mt-4 overflow-hidden rounded-[14px] border border-line bg-card p-3",
  wave: "block h-[120px] w-full cursor-pointer touch-manipulation rounded-lg",
  spectrum: "mt-2.5 block h-14 w-full rounded-lg",
} as const;

export interface Heading {
  readonly title: string;
  readonly facts: readonly string[];
}

export interface Header {
  readonly node: HTMLElement;
  readonly play: HTMLElement;
  readonly clock: HTMLElement;
  readonly total: HTMLElement;
  readonly position: HTMLElement;
  readonly section: HTMLElement;
  readonly progress: HTMLElement;
  readonly progressFill: HTMLElement;
}

export interface Deck {
  readonly node: HTMLElement;
  readonly wave: HTMLCanvasElement;
  readonly spectrum: HTMLCanvasElement;
}

const titleOf = ({ title, facts }: Heading): readonly HTMLElement[] => [
  make("h1")(CLASS.title, [title, make("i")(CLASS.cursor)]),
  div(
    CLASS.facts,
    pipe(
      facts,
      Arr.map((fact) => span("", [fact])),
    ),
  ),
];

const playButton = (): HTMLElement =>
  pipe(
    make("button")(CLASS.play, [span(CLASS.icon)]),
    withAttributes({ type: "button", "aria-label": "再生", "data-state": "paused" }),
  );

const timeOf = (clock: HTMLElement, total: HTMLElement): HTMLElement =>
  div(CLASS.time, [clock, " ", make("small")(CLASS.total, ["/ ", total])]);

export const headerOf = (heading: Heading): Header => {
  const play = playButton();
  const clock = span("", ["0:00"]);
  const total = span("", ["0:00"]);
  const position = withAttributes({ title: "小節.拍.16分" })(div(CLASS.position, ["1.1.1"]));
  const section = div(CLASS.section);
  const progressFill = make("b")(CLASS.progressFill);
  const progress = div(CLASS.progress, [progressFill]);
  const row = div(CLASS.row, [play, timeOf(clock, total), position, section]);
  const node = div("", [...titleOf(heading), div(CLASS.transport, [row, progress])]);
  return { node, play, clock, total, position, section, progress, progressFill };
};

export const deckOf = (): Deck => {
  const wave = withAttributes({ ...WAVE_SIZE, role: "img", "aria-label": "波形" })(
    canvas(CLASS.wave),
  );
  const spectrum = withAttributes({ ...SPECTRUM_SIZE, "aria-hidden": "true" })(
    canvas(CLASS.spectrum),
  );
  return { node: div(CLASS.deck, [wave, spectrum]), wave, spectrum };
};
