import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useAtomSet } from "@effect/atom-react";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, Option, pipe } from "effect";
import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

import { useStableDraftActions } from "#/pages/write/api/draft-actions.ts";
import { extensionsFor } from "#/pages/write/model/editor.ts";
import type { Wiring } from "#/pages/write/model/editor.ts";
import { paragraphsOf, textOf } from "#/pages/write/model/paragraph-ids.ts";
import { editorAtom, paragraphsAtom, placedAtom } from "#/pages/write/model/writing-atoms.ts";

type Paragraphs = readonly (typeof Paragraph.Type)[];

const started = (
  parent: HTMLDivElement,
  initial: Paragraphs,
  wiring: Omit<Wiring, "ids">,
): EditorView => {
  const ids = pipe(
    initial,
    Array.map(({ id }) => id),
  );
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: textOf(initial),
      extensions: extensionsFor({ ...wiring, ids }),
    }),
  });
  wiring.changed(view.state);
  view.focus();
  return view;
};

const EditorSurface = ({ initial }: Readonly<{ initial: Paragraphs }>): ReactNode => {
  const setEditor = useAtomSet(editorAtom);
  const setParagraphs = useAtomSet(paragraphsAtom);
  const setPlaced = useAtomSet(placedAtom);
  const viewRef = useRef(Option.none<EditorView>());
  const actions = useStableDraftActions(() => viewRef.current);
  const mount = useCallback(
    (parent: HTMLDivElement | null): (() => void) => {
      const changed = (state: EditorState): void => {
        setParagraphs(paragraphsOf(state));
      };
      const view = pipe(
        Option.fromNullishOr(parent),
        Option.map((element) => started(element, initial, { actions, layout: setPlaced, changed })),
      );
      viewRef.current = view;
      setEditor(view);
      return () => {
        if (Option.isSome(view)) {
          view.value.destroy();
        }
        setEditor(Option.none());
      };
    },
    [actions, initial, setEditor, setParagraphs, setPlaced],
  );
  return <div ref={mount} className="min-h-120 w-210 shrink-0" />;
};

export { EditorSurface };
