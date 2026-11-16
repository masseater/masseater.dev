import { javascript } from "@codemirror/lang-javascript";
import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { EditorState, StateEffect } from "@codemirror/state";
import type { Extension, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import type { Remote } from "comlink";
import { Array as Arr, Effect, pipe } from "effect";
import type { Scope } from "effect";

import { playground } from "#/shared/config/index.ts";

import type { CheckerWorker } from "./checker-runner.ts";
import { lintsOf, typeCompletion, typeHover } from "./language.ts";

export type Editor = Readonly<{ host: HTMLElement; doc: string; extensions: readonly Extension[] }>;

export type Checked = Readonly<{ doc: Text; lints: readonly Diagnostic[] }>;

export type MainPane = Readonly<{
  worker: Remote<CheckerWorker>;
  onChecked: (checked: Checked) => void;
}>;

export type Replacement = Readonly<{ view: EditorView; code: string }>;

export const GENERATED_PATH = `/${playground.panes.generated}`;

const MAIN_PATH = `/${playground.panes.main}`;

const songChanged = StateEffect.define<true>();

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "0.8125rem" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-tooltip": { maxWidth: "min(36rem, 90vw)" },
  ".cm-tooltip-hover, .cm-diagnostic": { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  ".cm-ts-hover": { padding: "0.25rem 0.5rem" },
  ".cm-ts-hover p": { margin: "0.25rem 0 0" },
});

const shadowOf = (host: HTMLElement): ShadowRoot =>
  host.shadowRoot ?? host.attachShadow({ mode: "open" });

const createEditor = ({ host, doc, extensions }: Editor): EditorView => {
  const root = shadowOf(host);
  return new EditorView({
    parent: root,
    root,
    doc,
    extensions: [basicSetup, theme, EditorView.lineWrapping, ...extensions],
  });
};

export const scopedEditor = (editor: Editor): Effect.Effect<EditorView, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => createEditor(editor)),
    (view) =>
      Effect.sync(() => {
        view.destroy();
      }),
  );

const typescriptPane = (worker: Remote<CheckerWorker>, path: string): readonly Extension[] => [
  javascript({ typescript: true }),
  typeHover({ worker, path }),
];

export const generatedPane = (worker: Remote<CheckerWorker>): readonly Extension[] => [
  EditorState.readOnly.of(true),
  ...typescriptPane(worker, GENERATED_PATH),
];

const changedSong = (update: ViewUpdate): boolean =>
  pipe(
    update.transactions,
    Arr.some((transaction) =>
      pipe(
        transaction.effects,
        Arr.some((effect) => effect.is(songChanged)),
      ),
    ),
  );

export const mainPane = ({ worker, onChecked }: MainPane): readonly Extension[] => [
  ...typescriptPane(worker, MAIN_PATH),
  linter(
    (view) =>
      Effect.runPromise(
        lintsOf({ worker, path: MAIN_PATH })(view).pipe(
          Effect.tap((lints) =>
            Effect.sync(() => {
              onChecked({ doc: view.state.doc, lints });
            }),
          ),
        ),
      ),
    { needsRefresh: changedSong },
  ),
  typeCompletion({ worker, path: MAIN_PATH }),
];

export const replaceDocument = ({ view, code }: Replacement): void => {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
};

export const notifySongChanged = (view: EditorView): void => {
  view.dispatch({ effects: songChanged.of(true) });
};
