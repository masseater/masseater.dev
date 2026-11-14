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
  public readonly kind: Kind;

  public readonly label: string;

  public constructor(kind: Kind, label: string) {
    super();
    this.kind = kind;
    this.label = label;
  }

  public override eq(other: GutterMarker): boolean {
    return other instanceof KindMarker && other.label === this.label;
  }

  public override toDOM(): Node {
    const marker = document.createElement("span");
    marker.dataset["kind"] = this.kind;
    marker.textContent = this.label;
    return marker;
  }
}

const kindGutter: Extension = gutter({
  class: "yohaku-kinds",
  lineMarker: (view, line) => {
    const kind = kindAt(view.state.doc.lineAt(line.from).number)(view.state);
    return pipe(
      LABELS[kind],
      Option.map((label) => new KindMarker(kind, label)),
      Option.getOrNull,
    );
  },
  lineMarkerChange: (update) =>
    update.state.field(annotationsField) !== update.startState.field(annotationsField) ||
    update.state.field(paragraphIdsField) !== update.startState.field(paragraphIdsField),
  initialSpacer: () => new KindMarker("memo", MEMO_LABEL),
});

export { kindGutter };
