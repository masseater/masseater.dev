import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi";
import type { MemoChangeValue } from "#/entities/watashi";

type Written = Readonly<{ written: readonly string[] }>;

export const useChangeMemo = (): UseMutationResult<Written, Error, MemoChangeValue> => {
  const client = useQueryClient();
  return useMutation({
    ...watashiQueries.memos.post.mutationOptions(),
    onSuccess: () => client.invalidateQueries(),
  });
};
