import type { EditorView } from "@codemirror/view";
import { useAtomSet } from "@effect/atom-react";
import type { Reaction } from "@masseater.dev/yohaku-protocol";
import { Effect, HashSet, Option, pipe } from "effect";
import { useEffect, useMemo, useRef } from "react";

import {
  draftClosed,
  draftOf,
  lineOf,
  draftRequestAtom,
  keptAtom,
} from "#/entities/manuscript/index.ts";
import type { DraftActions, DraftRequest } from "#/entities/manuscript/index.ts";
import { useYohaku } from "#/shared/api/index.ts";

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
    accept: (paragraphId): void => {
      withView(view(), (editor) => {
        accepted(editor, paragraphId);
      });
      setRequest(Option.none());
      log("draft-accepted");
    },
    rewrite: (paragraphId): void => {
      setRequest(retried(paragraphId));
      log("draft-rewritten");
    },
    keep: (paragraphId): void => {
      withView(view(), (editor) => {
        closed(editor, paragraphId);
      });
      setKept(HashSet.add(paragraphId));
      setRequest(Option.none());
      log("draft-kept");
    },
  };
};

export const useStableDraftActions = (view: () => Option.Option<EditorView>): DraftActions => {
  const actions = useDraftActions(view);
  const latestRef = useRef(actions);
  useEffect(() => {
    latestRef.current = actions;
  });
  return useMemo(
    (): DraftActions => ({
      accept: (paragraphId): void => {
        latestRef.current.accept(paragraphId);
      },
      rewrite: (paragraphId): void => {
        latestRef.current.rewrite(paragraphId);
      },
      keep: (paragraphId): void => {
        latestRef.current.keep(paragraphId);
      },
    }),
    [],
  );
};
