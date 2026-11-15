import type { SyncStatus } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Effect, Option } from "effect";
import { useCallback } from "react";

import { useYohaku } from "#/shared/api";

const SYNC_KEY = ["sync"] as const;
const POLL_INTERVAL = 5000;

const useSyncStatus = (): Option.Option<typeof SyncStatus.Type> => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: SYNC_KEY,
      queryFn: () => Effect.runPromise(yohaku.syncStatus()),
      refetchInterval: POLL_INTERVAL,
    }),
  );
  return Option.fromNullishOr(data);
};

const useSyncSignIn = (): Readonly<{ connect: () => void; pending: boolean }> => {
  const yohaku = useYohaku();
  const client = useQueryClient();
  const connecting = useCallback(() => Effect.runPromise(yohaku.beginSyncSignIn()), [yohaku]);
  const refresh = useCallback(() => client.invalidateQueries({ queryKey: SYNC_KEY }), [client]);
  const { mutate, isPending } = useMutation({ mutationFn: connecting, onSuccess: refresh });
  const connect = useCallback(() => {
    mutate();
  }, [mutate]);
  return { connect, pending: isPending };
};

export { useSyncSignIn, useSyncStatus };
