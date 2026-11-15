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
import { uploadAtom } from "./session.ts";

export const useRate = (id: number): ((rating: Rating) => void) => {
  const setEntries = useAtomSet(entriesAtom);
  const upload = useAtomSet(uploadAtom);
  return useCallback(
    (rating: Rating) => {
      setEntries(rated({ id, rating }));
      upload();
    },
    [setEntries, upload, id],
  );
};

export const useSave = (): (() => void) => {
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

export type { Rating } from "./atoms.ts";
export type { Change, Report, StrategyRow, Wait } from "./report.ts";
