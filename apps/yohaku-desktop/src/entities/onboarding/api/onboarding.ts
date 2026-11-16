import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array, Effect, Option, pipe } from "effect";
import { useCallback } from "react";

import { useYohaku } from "#/shared/api/index.ts";
import type { ClaudeStatus, OnboardingStep } from "#/shared/api/index.ts";

const DONE_KEY = ["onboarding"] as const;
const CLAUDE_KEY = ["claude-status"] as const;

export const useOnboardingDone = (): Option.Option<readonly OnboardingStep[]> => {
  const yohaku = useYohaku();
  const { data } = useQuery(
    queryOptions({
      queryKey: DONE_KEY,
      queryFn: () => Effect.runPromise(yohaku.onboardingDone()),
    }),
  );
  return Option.fromNullishOr(data);
};

export const useStepPending = (step: OnboardingStep): boolean =>
  pipe(
    useOnboardingDone(),
    Option.exists((done) => !pipe(done, Array.contains(step))),
  );

export const useCompleteStep = (): ((step: OnboardingStep) => void) => {
  const yohaku = useYohaku();
  const client = useQueryClient();
  const completed = useCallback(
    (step: OnboardingStep) => Effect.runPromise(yohaku.completeOnboardingStep(step)),
    [yohaku],
  );
  const refresh = useCallback(() => client.invalidateQueries({ queryKey: DONE_KEY }), [client]);
  const { mutate } = useMutation({ mutationFn: completed, onSuccess: refresh });
  return mutate;
};

export type Checked = Readonly<{
  status: Option.Option<ClaudeStatus>;
  checking: boolean;
  recheck: () => void;
}>;

export const useClaudeStatus = (): Checked => {
  const yohaku = useYohaku();
  const { data, isFetching, refetch } = useQuery(
    queryOptions({
      queryKey: CLAUDE_KEY,
      queryFn: () => Effect.runPromise(yohaku.claudeStatus()),
    }),
  );
  const recheck = useCallback(() => {
    Effect.runFork(Effect.promise(() => refetch()));
  }, [refetch]);
  return { status: Option.fromNullishOr(data), checking: isFetching, recheck };
};
