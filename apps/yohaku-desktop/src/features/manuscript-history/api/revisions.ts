import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { Effect, Option, pipe } from "effect";
import { useCallback } from "react";

import { useYohaku } from "#/shared/api";
import type { Revision } from "#/shared/api";
import { opened, useScreen } from "#/shared/model";

const NONE_YET: readonly Revision[] = [];

const useRevisions = (id: string): readonly Revision[] => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: ["revisions", id],
      queryFn: () => Effect.runPromise(yohaku.listRevisions(id)),
      staleTime: 0,
    }),
  );
  return pipe(
    Option.fromNullishOr(data),
    Option.getOrElse(() => NONE_YET),
  );
};

const useRestore = (id: string): ((revision: string) => void) => {
  const yohaku = useYohaku();
  const [screen, setScreen] = useScreen();
  const restoring = useCallback(
    (revision: string) => Effect.runPromise(yohaku.restoreRevision({ id, revision })),
    [id, yohaku],
  );
  const reopen = useCallback(() => {
    setScreen(opened(id)(screen));
  }, [id, screen, setScreen]);
  const { mutate } = useMutation({ mutationFn: restoring, onSuccess: reopen });
  return mutate;
};

export { useRestore, useRevisions };
