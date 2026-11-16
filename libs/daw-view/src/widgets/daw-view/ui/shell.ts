import type { Option } from "effect";

import { songSeconds } from "#/entities/song/index.ts";
import type { Structure } from "#/entities/song/index.ts";
import { createLoop } from "#/shared/lib/loop.ts";
import type { Loop } from "#/shared/lib/loop.ts";
import { createScroller } from "#/shared/lib/scroller.ts";
import type { Scroller } from "#/shared/lib/scroller.ts";
import { createStore } from "#/shared/lib/store.ts";
import type { Store } from "#/shared/lib/store.ts";
import type { Song } from "#/widgets/daw-view/model/contract.ts";
import { initialModel } from "#/widgets/daw-view/model/model.ts";
import type { Model } from "#/widgets/daw-view/model/model.ts";
import { readTheme } from "#/widgets/daw-view/model/theme.ts";
import { createTransport } from "#/widgets/daw-view/model/transport.ts";
import type { Transport } from "#/widgets/daw-view/model/transport.ts";

import { partsOf, surfacesOf } from "./parts.ts";
import type { Parts, Surfaces } from "./parts.ts";

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

export interface Mounting {
  readonly song: Song;
  readonly onLost: () => void;
}

export const shellOf =
  (root: HTMLElement) =>
  ({ song, onLost }: Mounting): Shell => {
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
        onLost,
      }),
      loop,
    };
  };
