import { queryOptions, useQuery } from "@tanstack/react-query";
import { Effect, Option } from "effect";

import { useYohaku } from "#/shared/api/index.ts";
import type { Mcp } from "#/shared/api/index.ts";

export const useMcp = (): Option.Option<Mcp> => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({ queryKey: ["mcp"], queryFn: () => Effect.runPromise(yohaku.getMcp()) }),
  );
  return Option.fromNullishOr(data);
};
