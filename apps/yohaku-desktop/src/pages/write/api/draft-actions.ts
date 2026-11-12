import type { EditorView } from "@codemirror/view";
import { useAtomSet } from "@effect/atom-react";
import type { Reaction } from "@masseater.dev/yohaku-protocol";
import { Effect, HashSet, Option, pipe } from "effect";
import { useEffect, useMemo, useRef } from "react";

import { draftClosed, draftOf } from "#/pages/write/model/memo-draft.ts";
import type { DraftActions } from "#/pages/write/model/memo-draft.ts";
import { lineOf } from "#/pages/write/model/paragraph-ids.ts";
import { draftRequestAtom, keptAtom } from "#/pages/write/model/writing-atoms.ts";
import type { DraftRequest } from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";

const FIRST_ATTEMPT = 0;
const NEXT = 1;

const accepted = (view: EditorView, paragraphId: string): void => {
  const found = Option.all({
    line: lineOf(paragraphId)(view.state),
    draft: draftOf(paragraphId)(view.state),
  });
  if (Option.isSome(found)) {
    const target = view.state.doc.line(found.value.line);
    view.dispatch({
      changes: { from: target.from, to: target.to, insert: found.value.draft.text },
      effects: draftClosed.of(paragraphId),
    });
  }
};

const closed = (view: EditorView, paragraphId: string): void => {
  view.dispatch({ effects: draftClosed.of(paragraphId) });
};

const retried =
  (paragraphId: string) =>
  (current: Option.Option<DraftRequest>): Option.Option<DraftRequest> =>
    Option.some({
      paragraphId,
      attempt: pipe(
        current,
        Option.map(({ attempt }) => attempt + NEXT),
        Option.getOrElse(() => FIRST_ATTEMPT + NEXT),
      ),
    });

const withView = (view: Option.Option<EditorView>, act: (editor: EditorView) => void): void => {
  if (Option.isSome(view)) {
    act(view.value);
  }
};

const useDraftActions = (view: () => Option.Option<EditorView>): DraftActions => {
  const yohaku = useYohaku();
  const setRequest = useAtomSet(draftRequestAtom);
  const setKept = useAtomSet(keptAtom);
  const log = (reaction: typeof Reaction.Type): void => {
    Effect.runFork(yohaku.logReaction(reaction));
  };
  return {
    accept: (paragraphId) => {
      withView(view(), (editor) => {
        accepted(editor, paragraphId);
      });
      setRequest(Option.none());
      log("draft-accepted");
    },
    rewrite: (paragraphId) => {
      setRequest(retried(paragraphId));
      log("draft-rewritten");
    },
    keep: (paragraphId) => {
      withView(view(), (editor) => {
        closed(editor, paragraphId);
      });
      setKept(HashSet.add(paragraphId));
      setRequest(Option.none());
      log("draft-kept");
    },
  };
};

const useStableDraftActions = (view: () => Option.Option<EditorView>): DraftActions => {
  const actions = useDraftActions(view);
  const latestRef = useRef(actions);
  useEffect(() => {
    latestRef.current = actions;
  });
  return useMemo(
    (): DraftActions => ({
      accept: (paragraphId) => {
        latestRef.current.accept(paragraphId);
      },
      rewrite: (paragraphId) => {
        latestRef.current.rewrite(paragraphId);
      },
      keep: (paragraphId) => {
        latestRef.current.keep(paragraphId);
      },
    }),
    [],
  );
};

export { useStableDraftActions };
