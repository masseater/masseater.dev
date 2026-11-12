import { useAtom, useAtomValue } from "@effect/atom-react";
import {
  experimental_streamedQuery as streamedQuery,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Effect, Option, pipe } from "effect";

import { dropped } from "#/pages/write/model/annotations.ts";
import type { Marked } from "#/pages/write/model/annotations.ts";
import { editorAtom, manuscriptIdAtom, rewritingAtom } from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";

interface RemarkActions {
  readonly rewriting: boolean;
  readonly proposal: Option.Option<string>;
  readonly done: boolean;
  readonly rewrite: () => void;
  readonly replace: () => void;
  readonly cancel: () => void;
  readonly keep: () => void;
}

const appendChunk = (text: string, chunk: string): string => `${text}${chunk}`;

const useProposal = (marked: Marked, rewriting: boolean): Readonly<{ proposal: Option.Option<string>; done: boolean }> => {
  const yohaku = useYohaku();
  const editor = useAtomValue(editorAtom);
  const id = useAtomValue(manuscriptIdAtom);
  const target = pipe(
    Option.all({ id, view: editor }),
    Option.filter(() => rewriting),
    Option.map(({ id: manuscript, view }) => {
      const line = view.state.doc.lineAt(marked.from);
      return {
        id: manuscript,
        paragraphId: marked.paragraphId,
        rule: marked.rule,
        from: marked.from - line.from,
        to: marked.to - line.from,
      };
    }),
  );
  const query = useQuery(
    queryOptions({
      queryKey: ["rewrite", marked.key],
      queryFn: streamedQuery({
        streamFn: () => yohaku.rewriteRemark(Option.getOrThrow(target)),
        reducer: appendChunk,
        initialValue: "",
      }),
      enabled: Option.isSome(target),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  return { proposal: Option.fromNullishOr(query.data), done: query.fetchStatus === "idle" };
};

const useRemarkActions = (marked: Marked): RemarkActions => {
  const yohaku = useYohaku();
  const editor = useAtomValue(editorAtom);
  const id = useAtomValue(manuscriptIdAtom);
  const [current, setRewriting] = useAtom(rewritingAtom);
  const rewriting = Option.contains(current, marked.key);
  const { proposal, done } = useProposal(marked, rewriting);
  const finish = (): void => setRewriting(Option.none());
  return {
    rewriting,
    proposal,
    done,
    rewrite: () => setRewriting(Option.some(marked.key)),
    replace: () => {
      Option.map(Option.all({ view: editor, text: proposal }), ({ view, text }) => {
        view.dispatch({
          changes: { from: marked.from, to: marked.to, insert: text },
          effects: dropped.of(marked.key),
        });
      });
      finish();
      Effect.runFork(Effect.promise(() => yohaku.logReaction("remark-rewritten")));
    },
    cancel: finish,
    keep: () => {
      Option.map(Option.all({ view: editor, manuscript: id }), ({ view, manuscript }) => {
        view.dispatch({ effects: dropped.of(marked.key) });
        Effect.runFork(
          Effect.promise(() =>
            yohaku.dismissRemark({ id: manuscript, paragraphId: marked.paragraphId, rule: marked.rule }),
          ),
        );
      });
    },
  };
};

export { useRemarkActions };
export type { RemarkActions };
