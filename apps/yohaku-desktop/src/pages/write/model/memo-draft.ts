import { Facet, StateEffect, StateField } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { Array, Option, Record, pipe } from "effect";

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

type Drafts = Readonly<Record<string, Draft>>;

const AFTER_LINE = 1;
const ACCEPT = "本文にする";
const REWRITE = "書き直させる";
const KEEP = "メモのまま";
const PRIMARY =
  "h-8 rounded-md bg-primary px-3.5 text-sm text-primary-foreground disabled:opacity-50";
const SECONDARY = "h-8 rounded-md border px-3.5 text-sm disabled:opacity-50";

const draftActions = Facet.define<DraftActions, Option.Option<DraftActions>>({
  combine: (values) => Array.head(values),
});

const draftSet = StateEffect.define<Readonly<{ paragraphId: string; draft: Draft }>>();
const draftClosed = StateEffect.define<string>();

const applied = (drafts: Drafts, effect: StateEffect<unknown>): Drafts => {
  if (effect.is(draftSet)) {
    return Record.set(drafts, effect.value.paragraphId, effect.value.draft);
  }
  if (effect.is(draftClosed)) {
    return Record.remove(drafts, effect.value);
  }
  return drafts;
};

interface ButtonSpec {
  readonly label: string;
  readonly style: string;
  readonly enabled: boolean;
  readonly press: () => void;
}

const buttonOf = ({ label, style, enabled, press }: ButtonSpec): HTMLButtonElement => {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.className = style;
  element.disabled = !enabled;
  element.addEventListener("click", press);
  return element;
};

const paragraphOf = (content: string): HTMLParagraphElement => {
  const text = document.createElement("p");
  text.className = "yohaku-draft-text";
  text.textContent = content;
  return text;
};

class DraftWidget extends WidgetType {
  public readonly paragraphId: string;
  public readonly draft: Draft;

  public constructor(paragraphId: string, draft: Draft) {
    super();
    this.paragraphId = paragraphId;
    this.draft = draft;
  }

  public override eq(other: WidgetType): boolean {
    return (
      other instanceof DraftWidget &&
      other.paragraphId === this.paragraphId &&
      other.draft.text === this.draft.text &&
      other.draft.done === this.draft.done
    );
  }

  public override toDOM(view: EditorView): HTMLElement {
    const box = document.createElement("section");
    box.className = "yohaku-draft";
    box.setAttribute("aria-label", "下書き");
    box.append(paragraphOf(this.draft.text));
    const actions = view.state.facet(draftActions);
    if (Option.isSome(actions)) {
      box.append(this.buttons(actions.value));
    }
    return box;
  }

  private buttons({ accept, rewrite, keep }: DraftActions): HTMLElement {
    const row = document.createElement("div");
    row.className = "flex gap-2";
    const { paragraphId, draft } = this;
    row.append(
      buttonOf({
        label: ACCEPT,
        style: PRIMARY,
        enabled: draft.done,
        press: () => {
          accept(paragraphId);
        },
      }),
      buttonOf({
        label: REWRITE,
        style: SECONDARY,
        enabled: draft.done,
        press: () => {
          rewrite(paragraphId);
        },
      }),
      buttonOf({
        label: KEEP,
        style: SECONDARY,
        enabled: true,
        press: () => {
          keep(paragraphId);
        },
      }),
    );
    return row;
  }
}

const widgetsOf = (state: EditorState, drafts: Drafts): DecorationSet =>
  Decoration.set(
    pipe(
      Record.toEntries(drafts),
      Array.map(([paragraphId, draft]) =>
        pipe(
          lineOf(paragraphId)(state),
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
  create: () => Record.empty(),
  update: (drafts, transaction) => {
    let next = drafts;
    for (const effect of transaction.effects) {
      next = applied(next, effect);
    }
    return next;
  },
  provide: (field) =>
    EditorView.decorations.compute([field], (state) => widgetsOf(state, state.field(field))),
});

const draftOf =
  (paragraphId: string) =>
  (state: EditorState): Option.Option<Draft> =>
    Record.get(state.field(draftsField), paragraphId);

export { draftActions, draftClosed, draftOf, draftSet, draftsField };
export type { Draft, DraftActions };
