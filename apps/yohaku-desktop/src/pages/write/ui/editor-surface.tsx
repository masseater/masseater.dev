import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useAtomSet } from "@effect/atom-react";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Option } from "effect";
import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

import { useDraftActions } from "#/pages/write/api/draft-actions.ts";
import { extensionsFor } from "#/pages/write/model/editor.ts";
import { paragraphsOf, textOf } from "#/pages/write/model/paragraph-ids.ts";
import { editorAtom, paragraphsAtom, placedAtom } from "#/pages/write/model/writing-atoms.ts";

type Paragraphs = readonly (typeof Paragraph.Type)[];

const EditorSurface = ({ initial }: Readonly<{ initial: Paragraphs }>): ReactNode => {
  const setEditor = useAtomSet(editorAtom);
  const setParagraphs = useAtomSet(paragraphsAtom);
  const setPlaced = useAtomSet(placedAtom);
  const current = useRef(Option.none<EditorView>());
  const actions = useDraftActions(() => current.current);
  const mount = useCallback(
    (parent: HTMLDivElement | null) => {
      if (parent === null) {
        return;
      }
      const view = new EditorView({
        parent,
        state: EditorState.create({
          doc: textOf(initial),
          extensions: extensionsFor({
            ids: initial.map(({ id }) => id),
            actions,
            layout: setPlaced,
            changed: (state) => setParagraphs(paragraphsOf(state)),
          }),
        }),
      });
      current.current = Option.some(view);
      setEditor(current.current);
      setParagraphs(paragraphsOf(view.state));
      view.focus();
      return () => {
        view.destroy();
        setEditor(Option.none());
      };
    },
    [],
  );
  return <div ref={mount} className="min-h-[60vh]" />;
};

export { EditorSurface };
