import type { Fact, Source } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Effect, Option, pipe } from "effect";
import { useCallback } from "react";

import { useYohaku } from "#/shared/api";

type Sources = readonly (typeof Source.Type)[];

const SOURCES_KEY = ["sources"] as const;
const NONE_YET: Sources = [];

const useSources = (): Sources => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: SOURCES_KEY,
      queryFn: () => Effect.runPromise(yohaku.listSources()),
    }),
  );
  return pipe(
    Option.fromNullishOr(data),
    Option.getOrElse(() => NONE_YET),
  );
};

const useRefreshSources = (): (() => Promise<void>) => {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: SOURCES_KEY }), [client]);
};

const useRevert = (): ((id: string) => void) => {
  const yohaku = useYohaku();
  const refresh = useRefreshSources();
  const reverted = useCallback(
    (id: string) => Effect.runPromise(yohaku.revertSource(id)),
    [yohaku],
  );
  const { mutate } = useMutation({ mutationFn: reverted, onSuccess: refresh });
  return mutate;
};

const useIngest = (): Readonly<{ ingest: (text: string) => void; pending: boolean }> => {
  const yohaku = useYohaku();
  const refresh = useRefreshSources();
  const ingested = useCallback(
    (text: string) => Effect.runPromise(yohaku.ingestText(text)),
    [yohaku],
  );
  const { mutate, isPending } = useMutation({ mutationFn: ingested, onSuccess: refresh });
  return { ingest: mutate, pending: isPending };
};

const NO_FACTS: readonly (typeof Fact.Type)[] = [];

const useSourceFacts = (id: string): readonly (typeof Fact.Type)[] => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: [...SOURCES_KEY, id, "facts"],
      queryFn: () => Effect.runPromise(yohaku.sourceFacts(id)),
    }),
  );
  return pipe(
    Option.fromNullishOr(data),
    Option.getOrElse(() => NO_FACTS),
  );
};

export { useIngest, useRevert, useSourceFacts, useSources };
