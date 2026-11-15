import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi";
import type { MemoChangeValue } from "#/entities/watashi";

export const useChangeMemo = (): UseMutationResult<
  Readonly<{ written: readonly string[] }>,
  Error,
  MemoChangeValue
> => {
  const client = useQueryClient();
  return useMutation({
    ...watashiQueries.memos.post.mutationOptions(),
    onSuccess: () => client.invalidateQueries(),
  });
};
