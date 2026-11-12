import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Source } from "@masseater.dev/yohaku-protocol";

import { useYohaku } from "#/shared/api";
import type { Mcp } from "#/shared/api";

const SOURCES_KEY = ["sources"] as const;

const useSources = (): readonly (typeof Source.Type)[] => {
  const yohaku = useYohaku();
  const { data = [] } = useQuery(queryOptions({ queryKey: SOURCES_KEY, queryFn: yohaku.listSources }));
  return data;
};

const useRefreshSources = (): (() => Promise<void>) => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: SOURCES_KEY });
};

const useRevert = (): ((id: string) => void) => {
  const yohaku = useYohaku();
  const refresh = useRefreshSources();
  const { mutate } = useMutation({ mutationFn: yohaku.revertSource, onSuccess: refresh });
  return mutate;
};

const useIngest = (): Readonly<{ ingest: (text: string) => void; pending: boolean }> => {
  const yohaku = useYohaku();
  const refresh = useRefreshSources();
  const { mutate, isPending } = useMutation({ mutationFn: yohaku.ingestText, onSuccess: refresh });
  return { ingest: mutate, pending: isPending };
};

const useMcp = (): Mcp | undefined => {
  const yohaku = useYohaku();
  return useQuery(queryOptions({ queryKey: ["mcp"], queryFn: yohaku.getMcp })).data;
};

export { useIngest, useMcp, useRevert, useSources };
