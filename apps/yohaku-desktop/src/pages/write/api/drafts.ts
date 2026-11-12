import { useAtomValue, useAtom } from "@effect/atom-react";
import {
  experimental_streamedQuery as streamedQuery,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { HashSet, Option, pipe } from "effect";
import { useEffect } from "react";

import { memoAtCursor } from "#/pages/write/model/memo-at-cursor.ts";
import { draftSet } from "#/pages/write/model/memo-draft.ts";
import {
  draftRequestAtom,
  editorAtom,
  keptAtom,
  manuscriptIdAtom,
  stalledAtom,
} from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";

const appendChunk = (draft: string, chunk: string): string => `${draft}${chunk}`;
const FIRST_ATTEMPT = 0;

const useStallDraft = (): void => {
  const stalled = useAtomValue(stalledAtom);
  const editor = useAtomValue(editorAtom);
  const kept = useAtomValue(keptAtom);
  const [, setRequest] = useAtom(draftRequestAtom);
  useEffect(() => {
    pipe(
      editor,
      Option.flatMap((view) => memoAtCursor(view.state)),
      Option.filter((paragraphId) => !HashSet.has(kept, paragraphId)),
      Option.map((paragraphId) => {
        setRequest(Option.some({ paragraphId, attempt: FIRST_ATTEMPT }));
      }),
    );
  }, [stalled, editor, kept, setRequest]);
};

const useDrafts = (): void => {
  useStallDraft();
  const yohaku = useYohaku();
  const editor = useAtomValue(editorAtom);
  const id = useAtomValue(manuscriptIdAtom);
  const request = useAtomValue(draftRequestAtom);
  const target = Option.all({ id, request });
  const query = useQuery(
    queryOptions({
      queryKey: ["draft", Option.getOrNull(target)],
      queryFn: streamedQuery({
        streamFn: () => {
          const { id: manuscript, request: { paragraphId } } = Option.getOrThrow(target);
          return yohaku.draftFromMemo({ id: manuscript, paragraphId });
        },
        reducer: appendChunk,
        initialValue: "",
      }),
      enabled: Option.isSome(target),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  const done = query.fetchStatus === "idle";
  useEffect(() => {
    const current = Option.all({ view: editor, request, text: Option.fromNullishOr(query.data) });
    Option.map(current, ({ view, request: { paragraphId }, text }) => {
      view.dispatch({ effects: draftSet.of({ paragraphId, draft: { text, done } }) });
    });
  }, [editor, request, query.data, done]);
};

export { useDrafts };
