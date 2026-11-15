import { Array as Arr, Option } from "effect";

import {
  ROLL_BARS,
  arrangeLevels,
  fittedScale,
  sizeCanvas,
  stepped,
  withinLevels,
} from "./metrics.ts";
import { settled } from "./model.ts";
import type { Metrics, Model } from "./model.ts";
import { keyboardWidth, rollScale } from "./roll-layout.ts";
import type { Shell } from "./shell.ts";
import { totalBars } from "./song.ts";
import type { Structure } from "./song.ts";

const RATIO = { dense: 2, plain: 1 } as const;
const DENSE = "(min-resolution: 1.1dppx)";
const LEAST_WIDTH = 40;
const WAITING_HEIGHT = 560;
const NARROW = 560;
const NARROW_BARS = 2;
const QUIET = 300;
const HALF = 2;
const NONE = 0;
const CLOSE = 1e-6;

const arrangeHeight = ({ session, phase }: Model): number => {
  if (phase.status === "ready") {
    return session.height;
  }
  return Math.max(session.height, WAITING_HEIGHT);
};

const ratioOf = (): number => {
  if (matchMedia(DENSE).matches) {
    return RATIO.dense;
  }
  return RATIO.plain;
};

const measure = ({ parts, model }: Shell): Metrics => {
  const heads = parts.tracks.heads.offsetWidth;
  return {
    ratio: ratioOf(),
    heads,
    arrange: {
      width: Math.max(LEAST_WIDTH, parts.tracks.scroll.clientWidth - heads),
      height: arrangeHeight(model.read()),
    },
    roll: { width: parts.roll.scroll.clientWidth, height: parts.roll.inner.clientHeight },
  };
};

const levelsOf = (structure: Structure, metrics: Metrics): readonly number[] =>
  arrangeLevels(metrics.arrange.width / totalBars(structure));

const scaleOf = (model: Model, levels: readonly number[]): number => {
  if (model.fit) {
    return fittedScale(levels);
  }
  return withinLevels(levels)(model.scale);
};

export const rollScaleOf = ({ metrics, rollBars }: Model): number =>
  rollScale({ width: metrics.roll.width, bars: rollBars });

const applyArrange = ({ parts, structure, model }: Shell): void => {
  const { metrics, scale } = model.read();
  const { tracks } = parts;
  const levels = levelsOf(structure, metrics);
  const content = Math.ceil(totalBars(structure) * scale);
  tracks.lanes.style.width = `${Math.max(metrics.arrange.width, content)}px`;
  tracks.lanes.style.height = `${metrics.arrange.height}px`;
  tracks.canvas.style.left = `${metrics.heads}px`;
  sizeCanvas(tracks.canvas)({ ...metrics.arrange, ratio: metrics.ratio });
  tracks.zoomOut.toggleAttribute("disabled", scale <= withinLevels(levels)(NONE) + CLOSE);
  tracks.zoomIn.toggleAttribute(
    "disabled",
    scale >= withinLevels(levels)(Number.POSITIVE_INFINITY) - CLOSE,
  );
};

const applyRoll = ({ parts, structure, model }: Shell): void => {
  const current = model.read();
  const { roll } = parts;
  const { width } = current.metrics.roll;
  const content = keyboardWidth(width) + totalBars(structure) * rollScaleOf(current);
  roll.inner.style.width = `${Math.ceil(content)}px`;
  sizeCanvas(roll.canvas)({ ...current.metrics.roll, ratio: current.metrics.ratio });
  roll.zoomOut.toggleAttribute("disabled", Option.contains(Arr.head(ROLL_BARS), current.rollBars));
  roll.zoomIn.toggleAttribute("disabled", Option.contains(Arr.last(ROLL_BARS), current.rollBars));
};

export const relayout = (shell: Shell): void => {
  const metrics = measure(shell);
  const levels = levelsOf(shell.structure, metrics);
  shell.model.step((model) => settled({ ...model, metrics, scale: scaleOf(model, levels) }));
  applyArrange(shell);
  applyRoll(shell);
};

export const firstLayout = (shell: Shell): void => {
  if (shell.parts.roll.scroll.clientWidth < NARROW) {
    shell.model.step((model) => ({ ...model, rollBars: NARROW_BARS }));
  }
  relayout(shell);
};

const hush = (model: Model): Model => ({ ...model, quiet: performance.now() + QUIET });

export const resized = (shell: Shell): void => {
  shell.model.step(hush);
  relayout(shell);
};

export const zoomArrange =
  (shell: Shell) =>
  (direction: number): void => {
    const { scale, metrics } = shell.model.read();
    const { node } = shell.scrollers.arrange;
    const half = metrics.arrange.width / HALF;
    const center = (node.scrollLeft + half) / scale;
    const next = stepped(levelsOf(shell.structure, metrics))(scale, direction);
    shell.model.step((model) => hush({ ...model, scale: next, fit: false }));
    relayout(shell);
    node.scrollLeft = Math.max(NONE, center * next - half);
  };

export const zoomRoll =
  (shell: Shell) =>
  (direction: number): void => {
    const before = shell.model.read();
    const { node } = shell.scrollers.roll;
    const { width } = before.metrics.roll;
    const half = (width - keyboardWidth(width)) / HALF;
    const center = (node.scrollLeft + half) / rollScaleOf(before);
    const rollBars = stepped(ROLL_BARS)(before.rollBars, direction);
    shell.model.step((model) => hush({ ...model, rollBars }));
    relayout(shell);
    node.scrollLeft = Math.max(NONE, center * rollScaleOf(shell.model.read()) - half);
  };
