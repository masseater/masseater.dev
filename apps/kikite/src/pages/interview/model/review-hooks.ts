import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useCallback, useMemo } from "react";

import { entriesAtom, heardAtom, phaseAtom, progressAtom } from "./atoms.ts";
import type { Rating } from "./atoms.ts";
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

export { useRate, useReport, useRestart, useSave };
export type { Rating } from "./atoms.ts";
export type { Change, Report, StrategyRow, Wait } from "./report.ts";
