import { Facet } from "@codemirror/state";
import { ViewPlugin } from "@codemirror/view";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import { Array, Option, pipe } from "effect";

import { remarksIn } from "./annotations.ts";
import type { Marked } from "./annotations.ts";

interface Placed {
  readonly marked: Marked;
  readonly top: number;
}

type Layout = (placed: readonly Placed[]) => void;

const remarkLayout = Facet.define<Layout, Option.Option<Layout>>({
  combine: (values) => Array.head(values),
});

const placedIn = (view: EditorView): readonly Placed[] =>
  pipe(
    remarksIn(view.state),
    Array.map((marked) => ({ marked, top: view.lineBlockAt(marked.from).top })),
  );

const measure = (view: EditorView): void => {
  view.requestMeasure({
    read: placedIn,
    write: (placed) => {
      const layout = view.state.facet(remarkLayout);
      if (Option.isSome(layout)) {
        layout.value(placed);
      }
    },
  });
};

const moved = (update: ViewUpdate): boolean =>
  update.docChanged || update.geometryChanged || Array.isReadonlyArrayNonEmpty(update.transactions);

const remarkLayoutPlugin = ViewPlugin.define((view) => {
  measure(view);
  return {
    update: (update: ViewUpdate): void => {
      if (moved(update)) {
        measure(update.view);
      }
    },
  };
});

export { remarkLayout, remarkLayoutPlugin };
export type { Placed };
