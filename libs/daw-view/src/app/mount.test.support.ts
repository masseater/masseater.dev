import { Effect } from "effect";
import type { Scope } from "effect";

import type { Song } from "./index.ts";
import { mountSong } from "./index.ts";

import styles from "#/styles.css?inline";

export interface Mounted {
  readonly style: HTMLStyleElement;
  readonly root: HTMLElement;
  readonly dispose: () => void;
}

const attach = (song: Song): Effect.Effect<Mounted> =>
  Effect.sync(() => {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.append(style);
    const root = document.createElement("main");
    document.body.classList.add("daw-song");
    document.body.append(root);
    const dispose = mountSong(root)(song);
    return { style, root, dispose };
  });

export const mount = (song: Song): Effect.Effect<Mounted, never, Scope.Scope> =>
  Effect.acquireRelease(attach(song), ({ style, root, dispose }) =>
    Effect.sync(() => {
      dispose();
      root.remove();
      style.remove();
    }),
  );
