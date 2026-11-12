import type { Extension } from "@codemirror/state";
import { GutterMarker, gutter } from "@codemirror/view";
import { Option, pipe } from "effect";

import { annotationsField, kindAt } from "./annotations.ts";
import type { Kind } from "./annotations.ts";
import { paragraphIdsField } from "./paragraph-ids.ts";

const MEMO_LABEL = "メモ";

const LABELS: Readonly<Record<Kind, Option.Option<string>>> = {
  prose: Option.none(),
  memo: Option.some(MEMO_LABEL),
  idea: Option.some("ネタ"),
};

class KindMarker extends GutterMarker {
  public readonly label: string;

  public constructor(label: string) {
    super();
    this.label = label;
  }

  public override eq(other: GutterMarker): boolean {
    return other instanceof KindMarker && other.label === this.label;
  }

  public override toDOM(): Node {
    return document.createTextNode(this.label);
  }
}

const kindGutter: Extension = gutter({
  class: "yohaku-kinds",
  lineMarker: (view, line) =>
    pipe(
      LABELS[kindAt(view.state.doc.lineAt(line.from).number)(view.state)],
      Option.map((label) => new KindMarker(label)),
      Option.getOrNull,
    ),
  lineMarkerChange: (update) =>
    update.state.field(annotationsField) !== update.startState.field(annotationsField) ||
    update.state.field(paragraphIdsField) !== update.startState.field(paragraphIdsField),
  initialSpacer: () => new KindMarker(MEMO_LABEL),
});

export { kindGutter };
