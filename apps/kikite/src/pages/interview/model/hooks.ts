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

type QuestionEntry = Extract<Entry, { kind: "question" }>;
type SpeechEntry = Extract<Entry, { kind: "speech" }>;

type Stage = Readonly<{
  history: readonly Entry[];
  question: Option.Option<QuestionEntry>;
  said: readonly SpeechEntry[];
}>;

const useRunSession = (): void => {
  useAtomMount(sessionAtom);
};

const useSession = (): Option.Option<Session> => AsyncResult.value(useAtomValue(sessionAtom));

const usePhase = (): Phase => useAtomValue(phaseAtom);

const useSummaryState = (): SummaryState => useAtomValue(summaryAtom);

const useTheme = (): string =>
  Option.match(summaryOf(useSummaryState()), {
    onNone: () => "",
    onSome: (summary) => summary.theme,
  });

const useWrapUp = (): (() => void) => {
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

const useSummary = (): Option.Option<InterviewSummary> => summaryOf(useSummaryState());

const usePanel = (): Panel => useAtomValue(panelAtom);

const useSetPanel = (): ((panel: Panel) => void) => useAtomSet(panelAtom);

const useAnswerDraft = (): string => useAtomValue(answerDraftAtom);

const useEntries = (): readonly Entry[] => useAtomValue(entriesAtom);

const useInterim = (): string => useAtomValue(interimAtom);

const useHearing = (): boolean => useAtomValue(hearingAtom);

const useAsking = (): Asking => useAtomValue(askingAtom);

const useListening = (): Listening => useAtomValue(listeningAtom);

const useNudge = (): Option.Option<Nudge> => useAtomValue(nudgeAtom);

const useLeads = (): readonly Lead[] => useAtomValue(leadsAtom);

const useResearching = (): Researching => useAtomValue(researchingAtom);

const useStale = (): boolean => useAtomValue(staleAtom);

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

const useStage = (): Stage => stageOf(useEntries());

const useAsked = (): boolean => pipe(useEntries(), Arr.some(isQuestion));

const useCheckpoint = (): boolean => {
  const { question, said } = useStage();
  const asking = useAsking();
  return (
    asking.status !== "drafting" &&
    Arr.isReadonlyArrayEmpty(said) &&
    Option.exists(question, (entry) => Option.contains(entry.strategy, "checkpoint"))
  );
};

const useSaving = (): Saving => useAtomValue(savingAtom);

const useToggleMic = (): (() => void) => {
  const toggle = useAtomSet(toggleMicAtom);
  return useCallback(() => {
    toggle();
  }, [toggle]);
};

export {
  useAnswerDraft,
  useAsked,
  useAsking,
  useCheckpoint,
  useEntries,
  useHearing,
  useInterim,
  useLeads,
  useListening,
  useNudge,
  usePanel,
  usePhase,
  useResearching,
  useRunSession,
  useSaving,
  useSession,
  useSetPanel,
  useStage,
  useStale,
  useSummary,
  useTheme,
  useToggleMic,
  useWrapUp,
};
export type { QuestionEntry, SpeechEntry, Stage };
export type { Asking, Entry, Lead, Listening, Panel, Researching, Saving } from "./atoms.ts";
export type { Session } from "./session.ts";
