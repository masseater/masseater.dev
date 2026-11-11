import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useCallback } from "react";

import {
  activatedAtom,
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  hearingAtom,
  interimAtom,
  listeningAtom,
  nudgeAtom,
  phaseAtom,
  speakerAtom,
  staleAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
import type { Asking, Entry, Listening, Nudge, Phase, SummaryState } from "./atoms.ts";
import { sessionAtom } from "./session.ts";
import type { Session } from "./session.ts";
import { toggleVoiceAtom } from "./voice-toggle.ts";

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

const useEnd = (): (() => void) => {
  const setPhase = useAtomSet(phaseAtom);
  return useCallback(() => {
    setPhase({ status: "report" });
  }, [setPhase]);
};

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

const useVoiceOn = (): boolean => {
  const speaker = useAtomValue(speakerAtom);
  const activated = useAtomValue(activatedAtom);
  return speaker && activated;
};

const useToggleVoice = (): (() => void) => {
  const toggle = useAtomSet(toggleVoiceAtom);
  return useCallback(() => {
    toggle();
  }, [toggle]);
};

export {
  useAnswerDraft,
  useAsked,
  useAsking,
  useEnd,
  useHearing,
  useInterim,
  useListening,
  useNudge,
  usePhase,
  useRunSession,
  useSession,
  useStage,
  useStale,
  useSummaryState,
  useTheme,
  useToggleVoice,
  useVoiceOn,
};
export type { QuestionEntry, SpeechEntry, Stage };
export { summaryOf } from "./atoms.ts";
export type { Asking, Entry, Listening, SummaryState } from "./atoms.ts";
export type { Session } from "./session.ts";
