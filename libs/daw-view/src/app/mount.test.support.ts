import { Effect } from "effect";
import type { Scope } from "effect";

import type { Song } from "./index.ts";
import { mountSong } from "./index.ts";

import styles from "#/styles.css?inline";

interface Mounted {
  readonly style: HTMLStyleElement;
  readonly root: HTMLElement;
}

const attach = (song: Song): Effect.Effect<Mounted> =>
  Effect.sync(() => {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.append(style);
    const root = document.createElement("main");
    document.body.classList.add("daw-song");
    document.body.append(root);
    mountSong(root)(song);
    return { style, root };
  });

export const mount = (song: Song): Effect.Effect<void, never, Scope.Scope> =>
  Effect.acquireRelease(attach(song), ({ style, root }) =>
    Effect.sync(() => {
      root.remove();
      style.remove();
    }),
  );
