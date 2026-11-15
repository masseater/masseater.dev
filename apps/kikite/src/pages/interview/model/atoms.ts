import { Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Recognition } from "#/pages/interview/lib/recognition";
import type { InterviewLead, InterviewSummary, RecordedEntry, RecordedProgress } from "#protocol";

import { storedPrevious } from "./memory.ts";

export type Entry = RecordedEntry;

export type Rating = Extract<Entry, { kind: "question" }>["rating"];

export type Input = Extract<Entry, { kind: "speech" }>["by"];

export type Progress = RecordedProgress;

export type Lead = InterviewLead;

export type Researching =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "running" }>
  | Readonly<{ status: "failed"; message: string }>;

export type Asking =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "drafting"; text: string }>
  | Readonly<{ status: "failed"; message: string }>;

export type SummaryState =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "updating"; summary: Option.Option<InterviewSummary> }>
  | Readonly<{ status: "ready"; summary: Option.Option<InterviewSummary> }>
  | Readonly<{ status: "failed"; summary: Option.Option<InterviewSummary>; message: string }>;

export type Listening =
  | Readonly<{ status: "off" }>
  | Readonly<{ status: "listening" }>
  | Readonly<{ status: "paused" }>
  | Readonly<{ status: "typing" }>
  | Readonly<{ status: "unsupported" }>
  | Readonly<{ status: "failed"; message: string }>;

export type Phase = Readonly<{ status: "interview" }> | Readonly<{ status: "report" }>;

export type Panel = "points" | "open" | "leads" | "transcript";

export type Saving =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "saving" }>
  | Readonly<{ status: "saved" }>
  | Readonly<{ status: "failed"; message: string }>;

export type Recording = Readonly<{ id: string; startedAt: number }>;

export type Nudge = Readonly<{ level: number; text: string }>;

export type Heard = Readonly<{
  lastActivityAt: number;
  spokeSinceQuestion: boolean;
  lastSummaryAt: number;
  summarizedThrough: number;
  correctedThrough: number;
  researchedFor: string;
  withdrawn: number;
}>;

const NOTHING_SUMMARIZED = -1;
const NEVER = 0;

export const freshHeard = (now: number): Heard => ({
  lastActivityAt: now,
  spokeSinceQuestion: false,
  lastSummaryAt: now,
  summarizedThrough: NOTHING_SUMMARIZED,
  correctedThrough: NOTHING_SUMMARIZED,
  researchedFor: "",
  withdrawn: 0,
});

const keep = <Value>(initial: Value): Atom.Writable<Value> => Atom.keepAlive(Atom.make(initial));

export const phaseAtom = keep<Phase>({ status: "interview" });
export const entriesAtom = keep<readonly Entry[]>([]);
export const interimAtom = keep("");
export const hearingAtom = keep(false);
export const askingAtom = keep<Asking>({ status: "idle" });
export const summaryAtom = keep<SummaryState>({ status: "empty" });
export const listeningAtom = keep<Listening>({ status: "off" });
export const heardAtom = keep<Heard>(freshHeard(NEVER));
export const recognitionAtom = keep<Option.Option<Recognition>>(Option.none());
export const answerDraftAtom = keep("");
export const progressAtom = keep<readonly Progress[]>([]);
export const nudgeAtom = keep<Option.Option<Nudge>>(Option.none());
export const staleAtom = keep(false);
export const previousThemeAtom = keep(storedPrevious());
export const panelAtom = keep<Panel>("points");
export const savingAtom = keep<Saving>({ status: "idle" });
export const recordingAtom = keep<Recording>({ id: "", startedAt: NEVER });
export const leadsAtom = keep<readonly Lead[]>([]);
export const researchingAtom = keep<Researching>({ status: "idle" });

export const summaryOf = (state: SummaryState): Option.Option<InterviewSummary> => {
  if (state.status === "empty") {
    return Option.none();
  }
  return state.summary;
};

/** @internal */
