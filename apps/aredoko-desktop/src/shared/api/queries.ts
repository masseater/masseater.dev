import type { Status } from "@masseater.dev/aredoko-protocol";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { getStatus } from "./aredoko.ts";

const STATUS_INTERVAL = 2000;

export const LIBRARY_POLL = { refetchInterval: 5000, retry: false } as const;

const STATUS_KEY = ["status"];

export const SOURCES_KEY = ["sources"];

export const PACKAGES_KEY = ["packages"];

export const ASSETS_KEY = ["assets"];

export const useStatus = (): UseQueryResult<typeof Status.Type> =>
  useQuery(
    queryOptions({
      queryKey: STATUS_KEY,
      queryFn: getStatus,
      refetchInterval: STATUS_INTERVAL,
      retry: false,
    }),
  );

export const useRefreshLibrary = (): (() => Promise<unknown>) => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: SOURCES_KEY }),
      client.invalidateQueries({ queryKey: PACKAGES_KEY }),
      client.invalidateQueries({ queryKey: ASSETS_KEY }),
      client.invalidateQueries({ queryKey: STATUS_KEY }),
    ]);
};
