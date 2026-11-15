import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import type { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import {
  annotationsField,
  noteLines,
  draftActions,
  draftsField,
  initialIds,
  paragraphIdsField,
  remarkLayout,
  remarkLayoutPlugin,
} from "#/entities/manuscript";
import type { DraftActions, Placed } from "#/entities/manuscript";

import { kindGutter } from "./kind-gutter.ts";
import { writingTheme } from "./theme.ts";

interface Wiring {
  readonly ids: readonly string[];
  readonly actions: DraftActions;
  readonly layout: (placed: readonly Placed[]) => void;
  readonly changed: (state: EditorState) => void;
}

const extensionsFor = ({ ids, actions, layout, changed }: Wiring): readonly Extension[] => [
  initialIds.of(ids),
  paragraphIdsField,
  annotationsField,
  noteLines,
  kindGutter,
  draftsField,
  draftActions.of(actions),
  remarkLayout.of(layout),
  remarkLayoutPlugin,
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  EditorView.lineWrapping,
  writingTheme,
  EditorView.contentAttributes.of({ "aria-label": "本文" }),
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      changed(update.state);
    }
  }),
];

export { extensionsFor };
export type { Wiring };
