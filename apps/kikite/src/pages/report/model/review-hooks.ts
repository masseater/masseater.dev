import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Effect, Option, pipe } from "effect";
import { useCallback, useMemo } from "react";

import {
  entriesAtom,
  heardAtom,
  phaseAtom,
  progressAtom,
  useSummary,
} from "#/entities/interview/index.ts";

import { handoffOf } from "./handoff.ts";
import { reportOf } from "./report.ts";
import type { Report } from "./report.ts";

const copied = (text: string): Effect.Effect<void> =>
  Effect.ignore(
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: String,
    }),
  );

export const useCopyHandoff = (): (() => void) => {
  const summary = useSummary();
  return useCallback(() => {
    pipe(
      summary,
      Option.map((current) => Effect.runFork(copied(handoffOf(current)))),
    );
  }, [summary]);
};

export const useRestart = (): (() => void) => {
  const setPhase = useAtomSet(phaseAtom);
  return useCallback(() => {
    setPhase({ status: "interview" });
  }, [setPhase]);
};

export const useReport = (): Report => {
  const entries = useAtomValue(entriesAtom);
  const progress = useAtomValue(progressAtom);
  const { withdrawn } = useAtomValue(heardAtom);
  return useMemo(() => reportOf({ entries, progress, withdrawn }), [entries, progress, withdrawn]);
};

export type { Change, Report, StrategyRow, Wait } from "./report.ts";
