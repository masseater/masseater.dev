import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";

import type { InterviewSummary } from "#protocol";

import {
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  hearingAtom,
  interimAtom,
  listeningAtom,
  nudgeAtom,
  panelAtom,
  phaseAtom,
  savingAtom,
  staleAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
import type {
  Asking,
  Entry,
  Listening,
  Nudge,
  Panel,
  Phase,
  Saving,
  SummaryState,
} from "./atoms.ts";

type QuestionEntry = Extract<Entry, { kind: "question" }>;
type SpeechEntry = Extract<Entry, { kind: "speech" }>;

type Stage = Readonly<{
  history: readonly Entry[];
  question: Option.Option<QuestionEntry>;
  said: readonly SpeechEntry[];
}>;

const usePhase = (): Phase => useAtomValue(phaseAtom);

const useSummaryState = (): SummaryState => useAtomValue(summaryAtom);

const useTheme = (): string =>
  Option.match(summaryOf(useSummaryState()), {
    onNone: () => "",
    onSome: (summary) => summary.theme,
  });

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

export {
  useAnswerDraft,
  useAsked,
  useAsking,
  useCheckpoint,
  useEntries,
  useHearing,
  useInterim,
  useListening,
  useNudge,
  usePanel,
  usePhase,
  useSaving,
  useSetPanel,
  useStage,
  useStale,
  useSummary,
  useTheme,
};
export type { QuestionEntry, SpeechEntry, Stage };
export type { Asking, Entry, Listening, Panel, Saving } from "./atoms.ts";
