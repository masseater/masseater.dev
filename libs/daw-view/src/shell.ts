import type { Option } from "effect";

import type { Song } from "./contract.ts";
import { createLoop } from "./loop.ts";
import type { Loop } from "./loop.ts";
import { initialModel } from "./model.ts";
import type { Model } from "./model.ts";
import { partsOf, surfacesOf } from "./parts.ts";
import type { Parts, Surfaces } from "./parts.ts";
import { createScroller } from "./scroller.ts";
import type { Scroller } from "./scroller.ts";
import { songSeconds } from "./song.ts";
import type { Structure } from "./song.ts";
import { createStore } from "./store.ts";
import type { Store } from "./store.ts";
import { readTheme } from "./theme.ts";
import { createTransport } from "./transport.ts";
import type { Transport } from "./transport.ts";

export interface Scrollers {
  readonly arrange: Scroller;
  readonly roll: Scroller;
}

export interface Shell {
  readonly parts: Parts;
  readonly surfaces: Option.Option<Surfaces>;
  readonly scrollers: Scrollers;
  readonly structure: Structure;
  readonly model: Store<Model>;
  readonly transport: Transport;
  readonly loop: Loop;
}

export const shellOf =
  (root: HTMLElement) =>
  (song: Song): Shell => {
    const loop = createLoop();
    const parts = partsOf(root)(song);
    return {
      parts,
      surfaces: surfacesOf(parts),
      scrollers: {
        arrange: createScroller(parts.tracks.scroll),
        roll: createScroller(parts.roll.scroll),
      },
      structure: song,
      model: createStore({ initial: initialModel(song)(readTheme(root)), onChange: loop.kick }),
      transport: createTransport({
        sampleRate: song.sampleRate,
        duration: songSeconds(song),
        onChange: loop.kick,
      }),
      loop,
    };
  };
