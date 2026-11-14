import { queryOptions, useQuery } from "@tanstack/react-query";
import { Effect, Option } from "effect";

import { useYohaku } from "#/shared/api";
import type { Mcp } from "#/shared/api";

const useMcp = (): Option.Option<Mcp> => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({ queryKey: ["mcp"], queryFn: () => Effect.runPromise(yohaku.getMcp()) }),
  );
  return Option.fromNullishOr(data);
};

export { useMcp };
