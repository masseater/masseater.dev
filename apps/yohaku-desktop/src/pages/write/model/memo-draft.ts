import { Facet, StateEffect, StateField } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { Array, HashMap, Option, pipe } from "effect";

import { lineOf } from "./paragraph-ids.ts";

interface Draft {
  readonly text: string;
  readonly done: boolean;
}

interface DraftActions {
  readonly accept: (paragraphId: string) => void;
  readonly rewrite: (paragraphId: string) => void;
  readonly keep: (paragraphId: string) => void;
}

const NO_ACTIONS: DraftActions = { accept: () => {}, rewrite: () => {}, keep: () => {} };
const AFTER_LINE = 1;

const draftActions = Facet.define<DraftActions, DraftActions>({
  combine: (values) => pipe(Array.head(values), Option.getOrElse(() => NO_ACTIONS)),
});

const draftSet = StateEffect.define<Readonly<{ paragraphId: string; draft: Draft }>>();
const draftClosed = StateEffect.define<string>();

type Drafts = HashMap.HashMap<string, Draft>;

const applied = (drafts: Drafts, effect: StateEffect<unknown>): Drafts => {
  if (effect.is(draftSet)) {
    return HashMap.set(drafts, effect.value.paragraphId, effect.value.draft);
  }
  if (effect.is(draftClosed)) {
    return HashMap.remove(drafts, effect.value);
  }
  return drafts;
};

const button = (label: string, primary: boolean, onClick: () => void): HTMLButtonElement => {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.className = primary
    ? "h-8 rounded-md bg-primary px-3.5 text-sm text-primary-foreground disabled:opacity-50"
    : "h-8 rounded-md border px-3.5 text-sm disabled:opacity-50";
  element.addEventListener("click", onClick);
  return element;
};

class DraftWidget extends WidgetType {
  readonly paragraphId: string;
  readonly draft: Draft;

  constructor(paragraphId: string, draft: Draft) {
    super();
    this.paragraphId = paragraphId;
    this.draft = draft;
  }

  override eq(other: WidgetType): boolean {
    return (
      other instanceof DraftWidget &&
      other.paragraphId === this.paragraphId &&
      other.draft.text === this.draft.text &&
      other.draft.done === this.draft.done
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    const actions = view.state.facet(draftActions);
    const box = document.createElement("section");
    box.className = "yohaku-draft";
    box.setAttribute("aria-label", "下書き");
    const text = document.createElement("p");
    text.className = "yohaku-draft-text";
    text.textContent = this.draft.text;
    const row = document.createElement("div");
    row.className = "flex gap-2";
    const accept = button("本文にする", true, () => actions.accept(this.paragraphId));
    const rewrite = button("書き直させる", false, () => actions.rewrite(this.paragraphId));
    accept.disabled = !this.draft.done;
    rewrite.disabled = !this.draft.done;
    row.append(accept, rewrite, button("メモのまま", false, () => actions.keep(this.paragraphId)));
    box.append(text, row);
    return box;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const widgetsOf = (state: EditorState, drafts: Drafts): ReturnType<typeof Decoration.set> =>
  Decoration.set(
    pipe(
      HashMap.toEntries(drafts),
      Array.map(([paragraphId, draft]) =>
        pipe(
          lineOf(state, paragraphId),
          Option.map((number) =>
            Decoration.widget({
              widget: new DraftWidget(paragraphId, draft),
              block: true,
              side: AFTER_LINE,
            }).range(state.doc.line(number).to),
          ),
        ),
      ),
      Array.getSomes,
    ),
    true,
  );

const draftsField = StateField.define<Drafts>({
  create: () => HashMap.empty(),
  update: (drafts, transaction) => pipe(transaction.effects, Array.reduce(drafts, applied)),
  provide: (field) =>
    EditorView.decorations.compute([field], (state) => widgetsOf(state, state.field(field))),
});

const draftOf = (state: EditorState, paragraphId: string): Option.Option<Draft> =>
  HashMap.get(state.field(draftsField), paragraphId);

export { draftActions, draftClosed, draftOf, draftSet, draftsField };
export type { Draft, DraftActions };
