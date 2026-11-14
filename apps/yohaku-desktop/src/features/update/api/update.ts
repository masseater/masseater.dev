import { useAtom } from "@effect/atom-react";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { Effect, Option, Stream } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

import { useYohaku } from "#/shared/api";
import type { Release } from "#/shared/api";

const UPDATE_KEY = ["update"] as const;
const RECHECK_INTERVAL = 21_600_000;
const STARTED = 0;

const progressAtom = Atom.make(Option.none<number>());

const useRelease = (): Option.Option<Release> => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: UPDATE_KEY,
      queryFn: () => Effect.runPromise(yohaku.checkUpdate()),
      refetchInterval: RECHECK_INTERVAL,
    }),
  );
  return Option.flatten(Option.fromNullishOr(data));
};

type Installing = Readonly<{
  install: () => void;
  progress: Option.Option<number>;
  failed: boolean;
}>;

const useInstall = (): Installing => {
  const yohaku = useYohaku();
  const [progress, setProgress] = useAtom(progressAtom);
  const installing = useCallback(() => {
    setProgress(Option.some(STARTED));
    return Effect.runPromise(
      Stream.runForEach(yohaku.installUpdate(), (done) =>
        Effect.sync(() => {
          setProgress(Option.some(done));
        }),
      ),
    );
  }, [setProgress, yohaku]);
  const stopped = useCallback(() => {
    setProgress(Option.none());
  }, [setProgress]);
  const { mutate, isError } = useMutation({ mutationFn: installing, onError: stopped });
  const install = useCallback(() => {
    mutate();
  }, [mutate]);
  return { install, progress, failed: isError };
};

export { useInstall, useRelease };
export type { Installing };
