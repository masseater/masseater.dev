import type { Manuscript } from "@masseater.dev/yohaku-protocol";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Effect, Option, pipe } from "effect";

import { useYohaku } from "#/shared/api";

type Manuscripts = readonly (typeof Manuscript.Type)[];

const NONE_YET: Manuscripts = [];

const useManuscripts = (): Manuscripts => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: ["manuscripts"],
      queryFn: () => Effect.runPromise(yohaku.listManuscripts()),
    }),
  );
  return pipe(
    Option.fromNullishOr(data),
    Option.getOrElse(() => NONE_YET),
  );
};

export { useManuscripts };
