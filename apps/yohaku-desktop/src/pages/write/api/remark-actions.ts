import type { EditorView } from "@codemirror/view";
import { useAtom, useAtomValue } from "@effect/atom-react";
import {
  experimental_streamedQuery as streamedQuery,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Effect, Option, Stream, String, pipe } from "effect";

import { dropped } from "#/pages/write/model/annotations.ts";
import type { Marked } from "#/pages/write/model/annotations.ts";
import { editorAtom, manuscriptIdAtom, rewritingAtom } from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";
import type { SpanTarget } from "#/shared/api";

interface Proposal {
  readonly proposal: Option.Option<string>;
  readonly done: boolean;
}

interface RemarkActions extends Proposal {
  readonly rewriting: boolean;
  readonly rewrite: () => void;
  readonly replace: () => void;
  readonly cancel: () => void;
  readonly keep: () => void;
}

const appendChunk = (text: string, chunk: string): string => `${text}${chunk}`;

const spanOf = (marked: Marked, view: EditorView, id: string): SpanTarget => {
  const line = view.state.doc.lineAt(marked.from);
  return {
    id,
    paragraphId: marked.paragraphId,
    rule: marked.rule,
    from: marked.from - line.from,
    to: marked.to - line.from,
  };
};

const useProposal = (marked: Marked, rewriting: boolean): Proposal => {
  const yohaku = useYohaku();
  const editor = useAtomValue(editorAtom);
  const id = useAtomValue(manuscriptIdAtom);
  const target = pipe(
    Option.all({ id, view: editor }),
    Option.filter(() => rewriting),
    Option.map(({ id: manuscript, view }) => spanOf(marked, view, manuscript)),
  );
  const query = useQuery(
    queryOptions({
      queryKey: ["rewrite", marked.key, rewriting],
      queryFn: streamedQuery({
        streamFn: () => Stream.toAsyncIterable(yohaku.rewriteRemark(Option.getOrThrow(target))),
        reducer: appendChunk,
        initialValue: String.empty,
      }),
      enabled: Option.isSome(target),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  return { proposal: Option.fromNullishOr(query.data), done: query.fetchStatus === "idle" };
};

const replaced = (marked: Marked, view: EditorView, text: string): void => {
  view.dispatch({
    changes: { from: marked.from, to: marked.to, insert: text },
    effects: dropped.of(marked.key),
  });
};

const useRemarkActions = (marked: Marked): RemarkActions => {
  const yohaku = useYohaku();
  const editor = useAtomValue(editorAtom);
  const id = useAtomValue(manuscriptIdAtom);
  const [current, setRewriting] = useAtom(rewritingAtom);
  const rewriting = Option.contains(current, marked.key);
  const { proposal, done } = useProposal(marked, rewriting);
  const finish = (): void => {
    setRewriting(Option.none());
  };
  return {
    rewriting,
    proposal,
    done,
    rewrite: () => {
      setRewriting(Option.some(marked.key));
    },
    replace: () => {
      const ready = Option.all({ view: editor, text: proposal });
      if (Option.isSome(ready)) {
        replaced(marked, ready.value.view, ready.value.text);
      }
      finish();
      Effect.runFork(yohaku.logReaction("remark-rewritten"));
    },
    cancel: finish,
    keep: () => {
      const ready = Option.all({ view: editor, manuscript: id });
      if (Option.isSome(ready)) {
        ready.value.view.dispatch({ effects: dropped.of(marked.key) });
        Effect.runFork(
          yohaku.dismissRemark({
            id: ready.value.manuscript,
            paragraphId: marked.paragraphId,
            rule: marked.rule,
          }),
        );
      }
    },
  };
};

export { useRemarkActions };
export type { RemarkActions };
