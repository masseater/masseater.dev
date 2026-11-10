import {
  experimental_streamedQuery as streamedQuery,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Effect, Option } from "effect";
import { useCallback } from "react";

import type { Preparation } from "#/pages/translator/model/preparation.ts";
import { preparationOf } from "#/pages/translator/model/preparation.ts";
import { useEngine } from "#/shared/api";
import type { Progress } from "#/shared/api";

const NOTHING = Option.none<Progress>();

const latest = (_previous: Option.Option<Progress>, progress: Progress): Option.Option<Progress> =>
  Option.some(progress);

const usePreparation = (): Readonly<{ preparation: Preparation; retry: () => void }> => {
  const engine = useEngine();
  const query = useQuery(
    queryOptions({
      queryKey: ["preparation"],
      queryFn: streamedQuery({
        streamFn: () => engine.prepare(),
        reducer: latest,
        initialValue: NOTHING,
      }),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
  );
  const { refetch } = query;
  const retry = useCallback(() => {
    Effect.runFork(Effect.promise(() => refetch()));
  }, [refetch]);
  return {
    retry,
    preparation: preparationOf({
      progress: Option.flatten(Option.fromNullishOr(query.data)),
      failure: Option.map(Option.fromNullishOr(query.error), ({ message }) => message),
      isFetching: query.isFetching,
      isSuccess: query.isSuccess,
    }),
  };
};

export { usePreparation };
