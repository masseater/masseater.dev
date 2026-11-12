import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { Array, HashMap, Option, String, pipe } from "effect";
import { useEffect } from "react";

import { received } from "#/pages/write/model/annotations.ts";
import {
  editorAtom,
  manuscriptIdAtom,
  pausedAtom,
  titleAtom,
} from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";
import type { Yohaku } from "#/shared/api";
import { screenAtom } from "#/shared/model";

type Paragraphs = readonly (typeof Paragraph.Type)[];

interface Saved {
  readonly id: string;
  readonly paragraphs: Paragraphs;
}

const isBlank = (paragraphs: Paragraphs): boolean =>
  Array.every(paragraphs, ({ text }) => String.isEmpty(String.trim(text)));

const textsOf = (paragraphs: Paragraphs): HashMap.HashMap<string, string> =>
  pipe(
    paragraphs,
    Array.map(({ id, text }) => [id, text] as const),
    HashMap.fromIterable,
  );

const useManuscriptId = (yohaku: Yohaku): (() => Promise<string>) => {
  const [id, setId] = useAtom(manuscriptIdAtom);
  const setScreen = useAtomSet(screenAtom);
  return async () => {
    if (Option.isSome(id)) {
      return id.value;
    }
    const created = await yohaku.createManuscript();
    setId(Option.some(created.id));
    setScreen((screen) => ({ ...screen, manuscript: created.id }));
    return created.id;
  };
};

const useSave = (): Option.Option<Saved> => {
  const yohaku = useYohaku();
  const paused = useAtomValue(pausedAtom);
  const manuscriptId = useManuscriptId(yohaku);
  const save = useMutation({
    mutationFn: async (paragraphs: Paragraphs): Promise<Saved> => {
      const id = await manuscriptId();
      await yohaku.saveParagraphs({ id, paragraphs });
      return { id, paragraphs };
    },
  });
  const { mutate } = save;
  useEffect(() => {
    if (!isBlank(paused)) {
      mutate(paused);
    }
  }, [paused, mutate]);
  return Option.fromNullishOr(save.data);
};

const useAutosave = (): void => {
  const yohaku = useYohaku();
  const saved = useSave();
  const editor = useAtomValue(editorAtom);
  const setTitle = useAtomSet(titleAtom);
  const { data } = useQuery(
    queryOptions({
      queryKey: ["annotations", Option.getOrNull(saved)],
      queryFn: async () => {
        const current = Option.getOrThrow(saved);
        const annotations = await yohaku.getAnnotations(current.id);
        return { annotations, texts: textsOf(current.paragraphs) };
      },
      enabled: Option.isSome(saved),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  useEffect(() => {
    const current = Option.all({ view: editor, result: Option.fromNullishOr(data) });
    Option.map(current, ({ view, result }) => {
      view.dispatch({ effects: received.of({ ...result.annotations, texts: result.texts }) });
      setTitle(result.annotations.title);
    });
  }, [data, editor, setTitle]);
};

export { useAutosave };
