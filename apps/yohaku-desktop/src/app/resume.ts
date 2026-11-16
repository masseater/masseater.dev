import { useAtom } from "@effect/atom-react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Array, Effect, Option, pipe } from "effect";
import { Atom } from "effect/reactivity";
import { useEffect } from "react";

import { useYohaku } from "#/shared/api/index.ts";
import { opened, useScreen } from "#/shared/model/index.ts";

const resumedAtom = Atom.make(false);

export const useResumed = (): boolean => {
  const yohaku = useYohaku();
  const [resumed, setResumed] = useAtom(resumedAtom);
  const [screen, setScreen] = useScreen();
  const { data, isError } = useQuery(
    queryOptions({
      queryKey: ["manuscripts"],
      queryFn: () => Effect.runPromise(yohaku.listManuscripts()),
    }),
  );
  const answered = Option.isSome(Option.fromNullishOr(data)) || isError;
  useEffect(() => {
    if (resumed || !answered) {
      return;
    }
    const latest = pipe(Option.fromNullishOr(data), Option.flatMap(Array.head));
    if (Option.isSome(latest)) {
      setScreen(opened(latest.value.id)(screen));
    }
    setResumed(true);
  }, [answered, data, resumed, screen, setResumed, setScreen]);
  return resumed;
};
