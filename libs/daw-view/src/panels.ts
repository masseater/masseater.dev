import { Array as Arr, String as Str, pipe } from "effect";

import { make, withAttributes } from "./dom.ts";

const div = make("div");
const span = make("span");
const canvas = make("canvas");
const section = make("section");

const SCHEME = /^https?:\/\//u;

const CLASS = {
  panel: "mt-4 overflow-hidden rounded-[14px] border border-line bg-card",
  head: "flex min-w-0 items-center gap-2 px-3 py-2.5",
  heading: "m-0 text-xs tracking-[0.1em] whitespace-nowrap text-dim uppercase",
  grow: "min-w-0 flex-1",
  tool: "daw-tool",
  scroll:
    "relative z-0 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-line [scrollbar-width:thin]",
  inner: "relative flex",
  heads: "sticky left-0 z-[3] w-[132px] flex-none border-r border-line bg-card max-sm:w-[106px]",
  corner:
    "flex h-[46px] items-end border-b border-line px-2 pb-1 text-[10px] tracking-[0.06em] text-dim",
  lanes: "relative flex-none cursor-pointer",
  arrange: "sticky block",
  playhead:
    "pointer-events-none absolute top-0 bottom-0 left-0 z-[2] -ml-px w-0.5 bg-hot will-change-transform",
  chips:
    "flex gap-1.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  rollInner: "block h-[360px] cursor-pointer max-sm:h-80",
  roll: "sticky left-0 block h-full",
  nowBox:
    "h-[calc(3em+16px)] border-t border-line px-3 py-2 text-xs leading-normal text-dim max-sm:h-[calc(4.5em+16px)]",
  now: "line-clamp-2 [overflow-wrap:anywhere] max-sm:line-clamp-3",
  legend: "flex flex-wrap gap-x-3.5 gap-y-1 px-3 pb-2.5 text-[11px] text-dim",
  credits: "mt-[26px] text-[12.5px] text-dim",
  summary: "cursor-pointer text-[13px] text-ink",
  list: "mt-2.5 list-disc pl-[1.2em]",
  item: "my-1 [overflow-wrap:anywhere]",
  link: "underline",
} as const;

export interface Credit {
  readonly what: string;
  readonly source: string;
  readonly license: string;
  readonly href: string;
}

export interface TracksPanel {
  readonly node: HTMLElement;
  readonly follow: HTMLElement;
  readonly zoomOut: HTMLElement;
  readonly zoomIn: HTMLElement;
  readonly scroll: HTMLElement;
  readonly heads: HTMLElement;
  readonly lanes: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly playhead: HTMLElement;
}

export interface RollPanel {
  readonly node: HTMLElement;
  readonly zoomOut: HTMLElement;
  readonly zoomIn: HTMLElement;
  readonly chips: HTMLElement;
  readonly scroll: HTMLElement;
  readonly inner: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly now: HTMLElement;
  readonly legend: HTMLElement;
}

const tool = (text: string, label: string): HTMLElement =>
  pipe(make("button")(CLASS.tool, [text]), withAttributes({ type: "button", "aria-label": label }));

const headOf = (title: string, tools: readonly HTMLElement[]): HTMLElement =>
  div(CLASS.head, [make("h2")(CLASS.heading, [title]), span(CLASS.grow), ...tools]);

const scroller = (label: string, inner: HTMLElement): HTMLElement =>
  pipe(
    div(CLASS.scroll, [inner]),
    withAttributes({ tabindex: "0", role: "group", "aria-label": label }),
  );

const timeline = (): Pick<TracksPanel, "canvas" | "heads" | "lanes" | "playhead" | "scroll"> => {
  const heads = div(CLASS.heads, [div(CLASS.corner, ["bar"])]);
  const arrange = canvas(CLASS.arrange);
  const playhead = div(CLASS.playhead);
  const lanes = div(CLASS.lanes, [arrange, playhead]);
  const scroll = scroller("トラックのタイムライン", div(CLASS.inner, [heads, lanes]));
  return { heads, canvas: arrange, playhead, lanes, scroll };
};

export const tracksPanel = (): TracksPanel => {
  const follow = withAttributes({ "aria-pressed": "true" })(tool("follow", "再生位置を追う"));
  const zoomOut = tool("−", "トラックを横に縮める");
  const zoomIn = tool("+", "トラックを横に広げる");
  const parts = timeline();
  const node = pipe(
    section(CLASS.panel, [headOf("tracks", [follow, zoomOut, zoomIn]), parts.scroll]),
    withAttributes({ "aria-label": "トラック" }),
  );
  return { ...parts, node, follow, zoomOut, zoomIn };
};

const rollBody = (): Pick<RollPanel, "canvas" | "inner" | "scroll"> => {
  const roll = canvas(CLASS.roll);
  const inner = div(CLASS.rollInner, [roll]);
  return { canvas: roll, inner, scroll: scroller("ピアノロール", inner) };
};

export const rollPanel = (): RollPanel => {
  const zoomOut = tool("−", "ピアノロールを横に縮める");
  const zoomIn = tool("+", "ピアノロールを横に広げる");
  const chips = div(CLASS.chips);
  const body = rollBody();
  const now = div(CLASS.now);
  const legend = withAttributes({ hidden: "" })(div(CLASS.legend));
  const node = pipe(
    section(CLASS.panel, [
      headOf("piano roll", [zoomOut, zoomIn]),
      chips,
      body.scroll,
      div(CLASS.nowBox, [now]),
      legend,
    ]),
    withAttributes({ "aria-label": "ピアノロール" }),
  );
  return { ...body, node, zoomOut, zoomIn, chips, now, legend };
};

const linkOf = (href: string): HTMLElement => {
  const link = make("a")(CLASS.link, [pipe(href, Str.replace(SCHEME, ""))]);
  return withAttributes({ href, target: "_blank", rel: "noopener" })(link);
};

const creditOf = ({ what, source, license, href }: Credit): HTMLElement =>
  make("li")(CLASS.item, [`${what}: ${source} — ${license} — `, linkOf(href)]);

export const creditsOf = (credits: readonly Credit[]): HTMLElement => {
  const items = pipe(credits, Arr.map(creditOf));
  return make("details")(CLASS.credits, [
    make("summary")(CLASS.summary, ["samples"]),
    make("ul")(CLASS.list, items),
  ]);
};
