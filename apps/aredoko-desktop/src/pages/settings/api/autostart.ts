import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

const AUTOSTART_KEY = ["autostart"];

const setAutostart = (enabled: boolean): Promise<void> => {
  if (enabled) {
    return enable();
  }
  return disable();
};

const useAutostart = (): UseQueryResult<boolean> =>
  useQuery(queryOptions({ queryKey: AUTOSTART_KEY, queryFn: isEnabled }));

const useSetAutostart = (): UseMutationResult<void, Error, boolean> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setAutostart,
    onSuccess: () => client.invalidateQueries({ queryKey: AUTOSTART_KEY }),
  });
};

export { useAutostart, useSetAutostart };
