import { useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  experimental_streamedQuery as streamedQuery,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Array, HashSet, Option, Stream, String, pipe } from "effect";
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
  const setRequest = useAtomSet(draftRequestAtom);
  useEffect(() => {
    const memo = pipe(
      editor,
      Option.flatMap((view) => memoAtCursor(view.state)),
      Option.filter((paragraphId) => !HashSet.has(kept, paragraphId)),
      Option.filter((paragraphId) =>
        pipe(
          stalled,
          Array.some(({ id }) => id === paragraphId),
        ),
      ),
    );
    if (Option.isSome(memo)) {
      setRequest(Option.some({ paragraphId: memo.value, attempt: FIRST_ATTEMPT }));
    }
  }, [stalled, editor, kept, setRequest]);
};

const useDraftText = (): Readonly<{ text: Option.Option<string>; done: boolean }> => {
  const yohaku = useYohaku();
  const id = useAtomValue(manuscriptIdAtom);
  const request = useAtomValue(draftRequestAtom);
  const target = Option.all({ id, request });
  const query = useQuery(
    queryOptions({
      queryKey: ["draft", Option.getOrNull(target)],
      queryFn: streamedQuery({
        streamFn: () => {
          const {
            id: manuscript,
            request: { paragraphId },
          } = Option.getOrThrow(target);
          return Stream.toAsyncIterable(yohaku.draftFromMemo({ id: manuscript, paragraphId }));
        },
        reducer: appendChunk,
        initialValue: String.empty,
      }),
      enabled: Option.isSome(target),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  return { text: Option.fromNullishOr(query.data), done: query.fetchStatus === "idle" };
};

const useDrafts = (): void => {
  useStallDraft();
  const editor = useAtomValue(editorAtom);
  const request = useAtomValue(draftRequestAtom);
  const { text, done } = useDraftText();
  const shown = Option.getOrNull(text);
  useEffect(() => {
    const current = Option.all({ view: editor, request, text: Option.fromNullishOr(shown) });
    if (Option.isSome(current)) {
      const {
        view,
        request: { paragraphId },
        text: drafted,
      } = current.value;
      view.dispatch({ effects: draftSet.of({ paragraphId, draft: { text: drafted, done } }) });
    }
  }, [editor, request, shown, done]);
};

export { useDrafts };
