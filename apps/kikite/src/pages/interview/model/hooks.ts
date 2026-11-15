import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useCallback } from "react";

import type { InterviewSummary } from "#protocol";

import {
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  hearingAtom,
  interimAtom,
  leadsAtom,
  listeningAtom,
  nudgeAtom,
  panelAtom,
  phaseAtom,
  researchingAtom,
  savingAtom,
  staleAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
import type {
  Asking,
  Entry,
  Lead,
  Listening,
  Nudge,
  Panel,
  Phase,
  Researching,
  Saving,
  SummaryState,
} from "./atoms.ts";
import { toggleMicAtom } from "./mic-toggle.ts";
import { sessionAtom } from "./session.ts";
import type { Session } from "./session.ts";

export type QuestionEntry = Extract<Entry, { kind: "question" }>;
export type SpeechEntry = Extract<Entry, { kind: "speech" }>;

export type Stage = Readonly<{
  history: readonly Entry[];
  question: Option.Option<QuestionEntry>;
  said: readonly SpeechEntry[];
}>;

export const useRunSession = (): void => {
  useAtomMount(sessionAtom);
};

export const useSession = (): Option.Option<Session> =>
  AsyncResult.value(useAtomValue(sessionAtom));

export const usePhase = (): Phase => useAtomValue(phaseAtom);

const useSummaryState = (): SummaryState => useAtomValue(summaryAtom);

export const useTheme = (): string =>
  Option.match(summaryOf(useSummaryState()), {
    onNone: () => "",
    onSome: (summary) => summary.theme,
  });

export const useWrapUp = (): (() => void) => {
  const session = useSession();
  const setPhase = useAtomSet(phaseAtom);
  return useCallback(() => {
    Option.match(session, {
      onNone: () => {
        setPhase({ status: "report" });
      },
      onSome: (current) => {
        current.wrapUp();
      },
    });
  }, [session, setPhase]);
};

export const useSummary = (): Option.Option<InterviewSummary> => summaryOf(useSummaryState());

export const usePanel = (): Panel => useAtomValue(panelAtom);

export const useSetPanel = (): ((panel: Panel) => void) => useAtomSet(panelAtom);

export const useAnswerDraft = (): string => useAtomValue(answerDraftAtom);

export const useEntries = (): readonly Entry[] => useAtomValue(entriesAtom);

export const useInterim = (): string => useAtomValue(interimAtom);

export const useHearing = (): boolean => useAtomValue(hearingAtom);

export const useAsking = (): Asking => useAtomValue(askingAtom);

export const useListening = (): Listening => useAtomValue(listeningAtom);

export const useNudge = (): Option.Option<Nudge> => useAtomValue(nudgeAtom);

export const useLeads = (): readonly Lead[] => useAtomValue(leadsAtom);

export const useResearching = (): Researching => useAtomValue(researchingAtom);

export const useStale = (): boolean => useAtomValue(staleAtom);

const isQuestion = (entry: Entry): entry is QuestionEntry =>
  entry.kind === "question" && Option.isSome(entry.strategy);

const isSpeech = (entry: Entry): entry is SpeechEntry => entry.kind === "speech";

const stageOf = (entries: readonly Entry[]): Stage => {
  const question = pipe(entries, Arr.findLast(isQuestion));
  return Option.match(question, {
    onNone: () => ({ history: [], question, said: pipe(entries, Arr.filter(isSpeech)) }),
    onSome: (current) => ({
      history: Arr.take(entries, current.id),
      question,
      said: pipe(Arr.drop(entries, current.id), Arr.filter(isSpeech)),
    }),
  });
};

export const useStage = (): Stage => stageOf(useEntries());

export const useAsked = (): boolean => pipe(useEntries(), Arr.some(isQuestion));

export const useCheckpoint = (): boolean => {
  const { question, said } = useStage();
  const asking = useAsking();
  return (
    asking.status !== "drafting" &&
    Arr.isReadonlyArrayEmpty(said) &&
    Option.exists(question, (entry) => Option.contains(entry.strategy, "checkpoint"))
  );
};

export const useSaving = (): Saving => useAtomValue(savingAtom);

export const useToggleMic = (): (() => void) => {
  const toggle = useAtomSet(toggleMicAtom);
  return useCallback(() => {
    toggle();
  }, [toggle]);
};

export type { Asking, Entry, Lead, Listening, Panel, Researching, Saving } from "./atoms.ts";
export type { Session } from "./session.ts";
