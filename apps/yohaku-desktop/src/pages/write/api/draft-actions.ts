import type { EditorView } from "@codemirror/view";
import { useAtomSet } from "@effect/atom-react";
import { Effect, HashSet, Option, pipe } from "effect";

import { draftClosed, draftOf } from "#/pages/write/model/memo-draft.ts";
import type { DraftActions } from "#/pages/write/model/memo-draft.ts";
import { lineOf } from "#/pages/write/model/paragraph-ids.ts";
import { draftRequestAtom, keptAtom } from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";

const accepted = (view: EditorView, paragraphId: string): void => {
  pipe(
    Option.all({
      line: lineOf(view.state, paragraphId),
      draft: draftOf(view.state, paragraphId),
    }),
    Option.map(({ line, draft }) => {
      const target = view.state.doc.line(line);
      view.dispatch({
        changes: { from: target.from, to: target.to, insert: draft.text },
        effects: draftClosed.of(paragraphId),
      });
    }),
  );
};

const useDraftActions = (view: () => Option.Option<EditorView>): DraftActions => {
  const yohaku = useYohaku();
  const setRequest = useAtomSet(draftRequestAtom);
  const setKept = useAtomSet(keptAtom);
  const log = (reaction: Parameters<typeof yohaku.logReaction>[0]): void => {
    Effect.runFork(Effect.promise(() => yohaku.logReaction(reaction)));
  };
  return {
    accept: (paragraphId) => {
      Option.map(view(), (editor) => accepted(editor, paragraphId));
      setRequest(Option.none());
      log("draft-accepted");
    },
    rewrite: (paragraphId) => {
      setRequest((current) =>
        Option.some({
          paragraphId,
          attempt: pipe(
            current,
            Option.map(({ attempt }) => attempt + 1),
            Option.getOrElse(() => 1),
          ),
        }),
      );
      log("draft-rewritten");
    },
    keep: (paragraphId) => {
      Option.map(view(), (editor) => editor.dispatch({ effects: draftClosed.of(paragraphId) }));
      setKept((kept) => HashSet.add(kept, paragraphId));
      setRequest(Option.none());
      log("draft-kept");
    },
  };
};

export { useDraftActions };
