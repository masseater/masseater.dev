import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useCallback } from "react";

import type { InterviewSetup } from "#protocol";

import {
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  interimAtom,
  listeningAtom,
  phaseAtom,
  settingsAtom,
  settingsOpenAtom,
  setupDraftAtom,
  summaryAtom,
} from "./atoms.ts";
import type { Asking, Entry, Listening, Phase, Settings, SummaryState } from "./atoms.ts";
import { sessionAtom } from "./session.ts";
import type { Session } from "./session.ts";

type QuestionEntry = Extract<Entry, { kind: "question" }>;

const useRunSession = (): void => {
  useAtomMount(sessionAtom);
};

const useSession = (): Option.Option<Session> => AsyncResult.value(useAtomValue(sessionAtom));

const useWithSession = (act: (session: Session) => void): (() => void) => {
  const session = useSession();
  return useCallback(() => {
    pipe(session, Option.map(act));
  }, [session, act]);
};

const usePhase = (): Phase => useAtomValue(phaseAtom);

const useTheme = (): string => {
  const phase = usePhase();
  if (phase.status === "interview") {
    return phase.setup.theme;
  }
  return "";
};

const useStart = (): (() => void) => {
  const setPhase = useAtomSet(phaseAtom);
  const setup = useAtomValue(setupDraftAtom);
  return useCallback(() => {
    setPhase({ status: "interview", setup });
  }, [setPhase, setup]);
};

const useEnd = (): (() => void) => {
  const setPhase = useAtomSet(phaseAtom);
  return useCallback(() => {
    setPhase({ status: "setup" });
  }, [setPhase]);
};

const useSetupDraft = (): InterviewSetup => useAtomValue(setupDraftAtom);

const useChangeSetupDraft = (): ((patch: Partial<InterviewSetup>) => void) => {
  const set = useAtomSet(setupDraftAtom);
  return useCallback(
    (patch: Partial<InterviewSetup>) => {
      set((current) => ({ ...current, ...patch }));
    },
    [set],
  );
};

const useSettings = (): Settings => useAtomValue(settingsAtom);

const useChangeSettings = (): ((patch: Partial<Settings>) => void) => {
  const set = useAtomSet(settingsAtom);
  return useCallback(
    (patch: Partial<Settings>) => {
      set((current) => ({ ...current, ...patch }));
    },
    [set],
  );
};

const useSettingsOpen = (): boolean => useAtomValue(settingsOpenAtom);

const useToggleSettings = (): (() => void) => {
  const set = useAtomSet(settingsOpenAtom);
  return useCallback(() => {
    set((open) => !open);
  }, [set]);
};

const useAnswerDraft = (): string => useAtomValue(answerDraftAtom);

const useSetAnswerDraft = (): ((text: string) => void) => useAtomSet(answerDraftAtom);

const useEntries = (): readonly Entry[] => useAtomValue(entriesAtom);

const useInterim = (): string => useAtomValue(interimAtom);

const useAsking = (): Asking => useAtomValue(askingAtom);

const useSummaryState = (): SummaryState => useAtomValue(summaryAtom);

const useListening = (): Listening => useAtomValue(listeningAtom);

const isQuestion = (entry: Entry): entry is QuestionEntry => entry.kind === "question";

const useLastQuestion = (): Option.Option<QuestionEntry> =>
  pipe(useEntries(), Arr.findLast(isQuestion));

export {
  useAnswerDraft,
  useAsking,
  useChangeSettings,
  useChangeSetupDraft,
  useEnd,
  useEntries,
  useInterim,
  useLastQuestion,
  useListening,
  usePhase,
  useRunSession,
  useSession,
  useSetAnswerDraft,
  useSettings,
  useSettingsOpen,
  useSetupDraft,
  useStart,
  useSummaryState,
  useTheme,
  useToggleSettings,
  useWithSession,
};
export type { QuestionEntry };
export { summaryOf } from "./atoms.ts";
export type { Draft, Entry, Listening, SummaryState } from "./atoms.ts";
export type { Session } from "./session.ts";
