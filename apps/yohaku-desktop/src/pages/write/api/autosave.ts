import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Annotations, Paragraph } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { Array, Effect, Option, Record, String, pipe } from "effect";
import { useCallback, useEffect } from "react";

import { received } from "#/pages/write/model/annotations.ts";
import type { Texts } from "#/pages/write/model/annotations.ts";
import {
  editorAtom,
  manuscriptIdAtom,
  pausedAtom,
  titleAtom,
} from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";
import type { Failure, Yohaku } from "#/shared/api";
import { screenAtom } from "#/shared/model";

type Paragraphs = readonly (typeof Paragraph.Type)[];

interface Saved {
  readonly id: string;
  readonly paragraphs: Paragraphs;
}

type Fetched = typeof Annotations.Type & Readonly<{ texts: Texts }>;

const isBlank = (paragraphs: Paragraphs): boolean =>
  pipe(
    paragraphs,
    Array.every(({ text }) => pipe(text, String.trim, String.isEmpty)),
  );

const textsOf = (paragraphs: Paragraphs): Texts =>
  pipe(
    paragraphs,
    Array.map(({ id, text }) => [id, text] as const),
    Record.fromEntries,
  );

const useManuscriptId = (yohaku: Yohaku): Effect.Effect<string, Failure> => {
  const [id, setId] = useAtom(manuscriptIdAtom);
  const setScreen = useAtomSet(screenAtom);
  const created = yohaku.createManuscript().pipe(
    Effect.tap(({ id: createdId }) =>
      Effect.sync(() => {
        setId(Option.some(createdId));
        setScreen((screen) => ({ ...screen, manuscript: createdId }));
      }),
    ),
    Effect.map(({ id: createdId }) => createdId),
  );
  return pipe(id, Option.match({ onNone: () => created, onSome: Effect.succeed }));
};

const useSave = (): Option.Option<Saved> => {
  const yohaku = useYohaku();
  const paused = useAtomValue(pausedAtom);
  const manuscriptId = useManuscriptId(yohaku);
  const saving = useCallback(
    (paragraphs: Paragraphs): Promise<Saved> =>
      Effect.runPromise(
        manuscriptId.pipe(
          Effect.tap((id) => yohaku.saveParagraphs({ id, paragraphs })),
          Effect.map((id) => ({ id, paragraphs })),
        ),
      ),
    [manuscriptId, yohaku],
  );
  const { mutate, data } = useMutation({ mutationFn: saving });
  useEffect(() => {
    if (!isBlank(paused)) {
      mutate(paused);
    }
  }, [paused, mutate]);
  return Option.fromNullishOr(data);
};

const fetchedWith =
  (paragraphs: Paragraphs) =>
  ({ title, kinds, remarks }: typeof Annotations.Type): Fetched => ({
    title,
    kinds,
    remarks,
    texts: textsOf(paragraphs),
  });

const useAutosave = (): void => {
  const yohaku = useYohaku();
  const saved = useSave();
  const editor = useAtomValue(editorAtom);
  const setTitle = useAtomSet(titleAtom);
  const { data } = useQuery(
    queryOptions({
      queryKey: ["annotations", Option.getOrNull(saved)],
      queryFn: () => {
        const { id, paragraphs } = Option.getOrThrow(saved);
        const fetching = yohaku.getAnnotations(id).pipe(Effect.map(fetchedWith(paragraphs)));
        return Effect.runPromise(fetching);
      },
      enabled: Option.isSome(saved),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  useEffect(() => {
    const current = Option.all({ view: editor, result: Option.fromNullishOr(data) });
    if (Option.isSome(current)) {
      const { view, result } = current.value;
      view.dispatch({ effects: received.of(result) });
      setTitle(result.title);
    }
  }, [data, editor, setTitle]);
};

export { useAutosave };
