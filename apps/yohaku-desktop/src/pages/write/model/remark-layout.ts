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

const NO_LAYOUT: Layout = () => {};

const remarkLayout = Facet.define<Layout, Layout>({
  combine: (values) => pipe(Array.head(values), Option.getOrElse(() => NO_LAYOUT)),
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
      view.state.facet(remarkLayout)(placed);
    },
  });
};

const remarkLayoutPlugin = ViewPlugin.define((view) => {
  measure(view);
  return {
    update: (update: ViewUpdate) => {
      if (update.docChanged || update.geometryChanged || update.transactions.length > 0) {
        measure(update.view);
      }
    },
  };
});

export { remarkLayout, remarkLayoutPlugin };
export type { Placed };
