import { Array as Arr, Option, pipe } from "effect";

import { sampleColor, trackColor } from "#/entities/song/index.ts";
import type { Tint, Lane, Session, Track } from "#/entities/song/index.ts";
import { make, withAttributes } from "#/shared/lib/dom.ts";

const span = make("span");

const LEGEND_LIMIT = 14;
const SWATCH = "--daw-swatch";
const SIGNATURE = "signature";

const CLASS = {
  head: "daw-head group cursor-pointer aria-pressed:bg-lane focus-visible:-outline-offset-2",
  led: "size-2 flex-none rounded-sm bg-(--daw-swatch) opacity-50 group-data-[lit=true]:opacity-100 group-data-[lit=true]:shadow-[0_0_7px_var(--daw-swatch)]",
  name: "min-w-0 flex-1 truncate",
  count: "flex-none text-[10px] text-dim tabular-nums max-sm:hidden",
  lane: "daw-head text-dim max-sm:gap-[3px] max-sm:px-1 max-sm:text-[9px]",
  value: "flex-none text-[10px] text-dim tabular-nums max-sm:text-[9px]",
  chip: "daw-tool",
  swatch: "inline-block size-2 flex-none rounded-sm bg-(--daw-swatch)",
  entry: "inline-flex items-center gap-[5px]",
} as const;

export interface Chrome {
  readonly session: Session;
  readonly tint: Tint;
}

const swatched = <Element extends HTMLElement>(node: Element, color: string): Element => {
  node.style.setProperty(SWATCH, color);
  return node;
};

const sized = <Element extends HTMLElement>(node: Element, height: number): Element => {
  node.style.height = `${height}px`;
  return node;
};

const headOf =
  (tint: Tint) =>
  (track: Track): HTMLElement => {
    const count = String(track.events.length);
    const node = make("button")(CLASS.head, [
      make("i")(CLASS.led),
      span(CLASS.name, [track.name]),
      span(CLASS.count, [count]),
    ]);
    const title = `${track.name} — ${count}`;
    withAttributes({ type: "button", "data-track": track.name, title })(node);
    return sized(swatched(node, trackColor(tint)(track)), track.height);
  };

const laneOf = (lane: Lane): HTMLElement => {
  const node = make("div")(CLASS.lane, [
    span(CLASS.name, [lane.automation.name]),
    span(CLASS.value),
  ]);
  return sized(withAttributes({ "data-automation": lane.automation.name })(node), lane.height);
};

const signatureOf = ({ session, tint }: Chrome): string => {
  const lanes = pipe(
    session.lanes,
    Arr.map((lane) => lane.automation.name),
  );
  return pipe(
    session.tracks,
    Arr.map((track) => `${track.name}:${track.height}:${track.events.length}`),
    Arr.appendAll(lanes),
    Arr.append(`${tint.lightness}:${tint.ink}`),
    Arr.join("|"),
  );
};

const stale = (node: HTMLElement, signature: string): boolean => {
  if (node.dataset[SIGNATURE] === signature) {
    return false;
  }
  node.dataset[SIGNATURE] = signature;
  return true;
};

export const buildHeads =
  (heads: HTMLElement) =>
  (chrome: Chrome): void => {
    if (stale(heads, signatureOf(chrome))) {
      const corner = Option.toArray(Option.fromNullishOr(heads.firstElementChild));
      const tracks = pipe(chrome.session.tracks, Arr.map(headOf(chrome.tint)));
      heads.replaceChildren(...corner, ...tracks, ...pipe(chrome.session.lanes, Arr.map(laneOf)));
    }
  };

const chipOf =
  (tint: Tint) =>
  (track: Track): HTMLElement => {
    const node = make("button")(CLASS.chip, [make("i")(CLASS.swatch), track.name]);
    withAttributes({ type: "button", "data-track": track.name })(node);
    return swatched(node, trackColor(tint)(track));
  };

const allChip = (): HTMLElement =>
  withAttributes({ type: "button", "data-track": "" })(make("button")(CLASS.chip, ["ALL"]));

export const buildChips =
  (chips: HTMLElement) =>
  (chrome: Chrome): void => {
    if (stale(chips, signatureOf(chrome))) {
      const tracks = pipe(chrome.session.tracks, Arr.map(chipOf(chrome.tint)));
      chips.replaceChildren(allChip(), ...tracks);
    }
  };

const pressed = (node: HTMLElement, selected: Option.Option<string>): boolean => {
  const name = node.dataset["track"] ?? "";
  if (node.classList.contains(CLASS.chip)) {
    return name === Option.getOrElse(selected, () => "");
  }
  return Option.contains(selected, name);
};

export const syncSelection =
  (root: HTMLElement) =>
  (selected: Option.Option<string>): void => {
    for (const node of root.querySelectorAll<HTMLElement>("button[data-track]")) {
      node.setAttribute("aria-pressed", String(pressed(node, selected)));
    }
  };

const entryOf =
  (track: Track, tint: Tint) =>
  (sample: Readonly<{ name: string; count: number }>, index: number): HTMLElement => {
    const swatch = swatched(make("i")(CLASS.swatch), sampleColor(tint)({ hue: track.hue, index }));
    return span(CLASS.entry, [swatch, `${sample.name} ×${sample.count}`]);
  };

const overflow = (track: Track): readonly HTMLElement[] => {
  if (track.samples.length > LEGEND_LIMIT) {
    return [span("", [`+${track.samples.length - LEGEND_LIMIT}`])];
  }
  return [];
};

export const paintLegend =
  (legend: HTMLElement) =>
  ({ track, tint }: Readonly<{ track: Option.Option<Track>; tint: Tint }>): void => {
    legend.toggleAttribute("hidden", Option.isNone(track));
    legend.replaceChildren();
    if (Option.isSome(track)) {
      const entry = entryOf(track.value, tint);
      const entries = pipe(track.value.samples, Arr.take(LEGEND_LIMIT), Arr.map(entry));
      legend.replaceChildren(...entries, ...overflow(track.value));
    }
  };
