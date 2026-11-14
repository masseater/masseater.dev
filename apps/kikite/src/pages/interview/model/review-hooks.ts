import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Effect, Option, pipe } from "effect";
import { useCallback, useMemo } from "react";

import { entriesAtom, heardAtom, phaseAtom, progressAtom } from "./atoms.ts";
import type { Rating } from "./atoms.ts";
import { handoffOf } from "./handoff.ts";
import { useSummary } from "./hooks.ts";
import { rated } from "./rate.ts";
import { saveAtom } from "./record.ts";
import { reportOf } from "./report.ts";
import type { Report } from "./report.ts";

const useRate = (id: number): ((rating: Rating) => void) => {
  const setEntries = useAtomSet(entriesAtom);
  return useCallback(
    (rating: Rating) => {
      setEntries(rated({ id, rating }));
    },
    [setEntries, id],
  );
};

const useSave = (): (() => void) => {
  const save = useAtomSet(saveAtom);
  return useCallback(() => {
    save();
  }, [save]);
};

const copied = (text: string): Effect.Effect<void> =>
  Effect.ignore(
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: String,
    }),
  );

const useCopyHandoff = (): (() => void) => {
  const summary = useSummary();
  return useCallback(() => {
    pipe(
      summary,
      Option.map((current) => Effect.runFork(copied(handoffOf(current)))),
    );
  }, [summary]);
};

const useRestart = (): (() => void) => {
  const setPhase = useAtomSet(phaseAtom);
  return useCallback(() => {
    setPhase({ status: "interview" });
  }, [setPhase]);
};

const useReport = (): Report => {
  const entries = useAtomValue(entriesAtom);
  const progress = useAtomValue(progressAtom);
  const { withdrawn } = useAtomValue(heardAtom);
  return useMemo(() => reportOf({ entries, progress, withdrawn }), [entries, progress, withdrawn]);
};

export { useCopyHandoff, useRate, useReport, useRestart, useSave };
export type { Rating } from "./atoms.ts";
export type { Change, Report, StrategyRow, Wait } from "./report.ts";
