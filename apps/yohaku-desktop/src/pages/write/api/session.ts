import { useAtom, useAtomSet } from "@effect/atom-react";
import type { Paragraph, Title } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { HashSet, Option } from "effect";
import { Atom } from "effect/reactivity";
import { useEffect } from "react";

import {
  NO_TITLE,
  draftRequestAtom,
  keptAtom,
  manuscriptIdAtom,
  placedAtom,
  rewritingAtom,
  titleAtom,
} from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";
import { useScreen } from "#/shared/model";

type Paragraphs = readonly (typeof Paragraph.Type)[];

interface Opening {
  readonly id: Option.Option<string>;
  readonly title: typeof Title.Type | null;
  readonly paragraphs: Paragraphs;
}

const NOT_READY = -1;
const NOTHING_WRITTEN: Paragraphs = [];

const readySessionAtom = Atom.make(NOT_READY);

const useOpening = (): Option.Option<Opening> => {
  const yohaku = useYohaku();
  const [{ opening }] = useScreen();
  const id = Option.fromNullishOr(opening);
  const { data } = useQuery(
    queryOptions({
      queryKey: ["manuscript", opening],
      queryFn: () => yohaku.openManuscript(Option.getOrThrow(id)),
      enabled: Option.isSome(id),
      staleTime: 0,
    }),
  );
  if (Option.isNone(id)) {
    return Option.some({ id, title: NO_TITLE, paragraphs: NOTHING_WRITTEN });
  }
  return Option.map(Option.fromNullishOr(data), (opened) => ({
    id,
    title: opened.manuscript.title,
    paragraphs: opened.paragraphs,
  }));
};

const useResetSession = (session: number, opening: Option.Option<Opening>): void => {
  const setId = useAtomSet(manuscriptIdAtom);
  const setTitle = useAtomSet(titleAtom);
  const setKept = useAtomSet(keptAtom);
  const setRequest = useAtomSet(draftRequestAtom);
  const setPlaced = useAtomSet(placedAtom);
  const setRewriting = useAtomSet(rewritingAtom);
  const [, setReady] = useAtom(readySessionAtom);
  const loaded = Option.isSome(opening);
  useEffect(() => {
    Option.map(opening, ({ id, title }) => {
      setId(id);
      setTitle(title);
      setKept(HashSet.empty());
      setRequest(Option.none());
      setPlaced([]);
      setRewriting(Option.none());
      setReady(session);
    });
  }, [session, loaded]);
};

const useSession = (): Option.Option<Paragraphs> => {
  const [{ session }] = useScreen();
  const opening = useOpening();
  const [ready] = useAtom(readySessionAtom);
  useResetSession(session, opening);
  return Option.flatMap(opening, ({ paragraphs }) =>
    ready === session ? Option.some(paragraphs) : Option.none(),
  );
};

export { useSession };
