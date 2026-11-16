import { Option } from "effect";

import { EMPTY_TAKE, sessionOf } from "#/entities/song/index.ts";
import type { NoteEvent, Structure, Session } from "#/entities/song/index.ts";

import type { Shade } from "./mix.ts";
import { UNMIXED, heardIn, mixingOf, toggled } from "./mixing.ts";
import type { Change, Mixing } from "./mixing.ts";
import type { Size } from "./pen.ts";
import { layoutOf } from "./roll-layout.ts";
import type { RollLayout } from "./roll-layout.ts";
import type { Theme } from "./theme.ts";

const NONE = 0;
const ONE = 1;
const DEFAULT_SCALE = 12;
const DEFAULT_BARS = 4;

export type Phase =
  | { readonly status: "loading"; readonly label: string; readonly share: number }
  | { readonly status: "ready"; readonly seconds: number }
  | { readonly status: "failed"; readonly message: string };

export interface Metrics {
  readonly ratio: number;
  readonly heads: number;
  readonly arrange: Size;
  readonly roll: Size;
}

export interface Model {
  readonly session: Session;
  readonly mixing: Mixing;
  readonly layout: RollLayout;
  readonly shades: readonly Shade[];
  readonly selected: Option.Option<string>;
  readonly hover: Option.Option<NoteEvent>;
  readonly follow: boolean;
  readonly scale: number;
  readonly fit: boolean;
  readonly rollBars: number;
  readonly quiet: number;
  readonly peaks: Float32Array;
  readonly phase: Phase;
  readonly theme: Theme;
  readonly metrics: Metrics;
}

export const settled = (model: Model): Model => {
  const session = heardIn(model.mixing)(model.session);
  return {
    ...model,
    session,
    layout: layoutOf({ session, selected: model.selected, height: model.metrics.roll.height }),
  };
};

export const mixedWith =
  (tracks: readonly string[]) =>
  (model: Model): Model =>
    settled({ ...model, mixing: mixingOf(tracks) });

export const flippedBy =
  (change: Change) =>
  (model: Model): Model =>
    settled({ ...model, mixing: toggled(change)(model.mixing) });

const EMPTY: Size = { width: NONE, height: NONE };

export const initialModel =
  (structure: Structure) =>
  (theme: Theme): Model => {
    const session = sessionOf(structure)(EMPTY_TAKE);
    return {
      session,
      mixing: UNMIXED,
      layout: layoutOf({ session, selected: Option.none(), height: NONE }),
      shades: [],
      selected: Option.none(),
      hover: Option.none(),
      follow: true,
      scale: DEFAULT_SCALE,
      fit: true,
      rollBars: DEFAULT_BARS,
      quiet: NONE,
      peaks: new Float32Array(NONE),
      phase: { status: "loading", label: "samples", share: NONE },
      theme,
      metrics: { ratio: ONE, heads: NONE, arrange: EMPTY, roll: EMPTY },
    };
  };
