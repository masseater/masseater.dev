import { useAtom, useAtomSet } from "@effect/atom-react";
import type { Paragraph, Title } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Effect, HashSet, Option, pipe } from "effect";
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
import type { Opened } from "#/shared/api";
import { useScreen } from "#/shared/model";

type Paragraphs = readonly (typeof Paragraph.Type)[];

interface Opening {
  readonly id: Option.Option<string>;
  readonly title: typeof Title.Type | null;
  readonly paragraphs: Paragraphs;
}

const NOT_READY = -1;
const NOTHING_WRITTEN: Paragraphs = [];
const FRESH = 0;

const readySessionAtom = Atom.make(NOT_READY);

const openingOf =
  (id: Option.Option<string>) =>
  ({ manuscript, paragraphs }: Opened): Opening => ({
    id,
    title: manuscript.title,
    paragraphs,
  });

const useOpening = (): Option.Option<Opening> => {
  const yohaku = useYohaku();
  const [{ opening }] = useScreen();
  const id = Option.fromNullishOr(opening);
  const { data } = useQuery(
    queryOptions({
      queryKey: ["manuscript", opening],
      queryFn: () => {
        const wanted = Option.getOrThrow(Option.fromNullishOr(opening));
        return Effect.runPromise(yohaku.openManuscript(wanted));
      },
      enabled: Option.isSome(id),
      staleTime: FRESH,
    }),
  );
  if (Option.isNone(id)) {
    return Option.some({ id, title: NO_TITLE, paragraphs: NOTHING_WRITTEN });
  }
  return pipe(Option.fromNullishOr(data), Option.map(openingOf(id)));
};

const useResetters = (): ((opening: Opening, session: number) => void) => {
  const setId = useAtomSet(manuscriptIdAtom);
  const setTitle = useAtomSet(titleAtom);
  const setKept = useAtomSet(keptAtom);
  const setRequest = useAtomSet(draftRequestAtom);
  const setPlaced = useAtomSet(placedAtom);
  const setRewriting = useAtomSet(rewritingAtom);
  const setReady = useAtomSet(readySessionAtom);
  return ({ id, title }, session) => {
    setId(id);
    setTitle(title);
    setKept(HashSet.empty());
    setRequest(Option.none());
    setPlaced([]);
    setRewriting(Option.none());
    setReady(session);
  };
};

const useSession = (): Option.Option<Paragraphs> => {
  const [{ session }] = useScreen();
  const opening = useOpening();
  const [ready] = useAtom(readySessionAtom);
  const reset = useResetters();
  const loaded = Option.getOrNull(opening);
  useEffect(() => {
    const pending = pipe(
      Option.fromNullishOr(loaded),
      Option.filter(() => ready !== session),
    );
    if (Option.isSome(pending)) {
      reset(pending.value, session);
    }
  }, [ready, session, loaded, reset]);
  return pipe(
    opening,
    Option.filter(() => ready === session),
    Option.map(({ paragraphs }) => paragraphs),
  );
};

export { useSession };
