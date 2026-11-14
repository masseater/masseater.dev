import { Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Recognition } from "#/pages/interview/lib/recognition";
import type { InterviewSummary, RecordedEntry, RecordedProgress } from "#protocol";

import { storedPrevious } from "./memory.ts";

type Entry = RecordedEntry;

type Rating = Extract<Entry, { kind: "question" }>["rating"];

type Input = Extract<Entry, { kind: "speech" }>["by"];

type Progress = RecordedProgress;

type Asking =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "drafting"; text: string }>
  | Readonly<{ status: "failed"; message: string }>;

type SummaryState =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "updating"; summary: Option.Option<InterviewSummary> }>
  | Readonly<{ status: "ready"; summary: Option.Option<InterviewSummary> }>
  | Readonly<{ status: "failed"; summary: Option.Option<InterviewSummary>; message: string }>;

type Listening =
  | Readonly<{ status: "off" }>
  | Readonly<{ status: "listening" }>
  | Readonly<{ status: "paused" }>
  | Readonly<{ status: "typing" }>
  | Readonly<{ status: "unsupported" }>
  | Readonly<{ status: "failed"; message: string }>;

type Phase = Readonly<{ status: "interview" }> | Readonly<{ status: "report" }>;

type Panel = "points" | "open" | "transcript";

type Saving =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "saving" }>
  | Readonly<{ status: "saved" }>
  | Readonly<{ status: "failed"; message: string }>;

type Recording = Readonly<{ id: string; startedAt: number }>;

type Nudge = Readonly<{ level: number; text: string }>;

type Heard = Readonly<{
  lastActivityAt: number;
  spokeSinceQuestion: boolean;
  lastSummaryAt: number;
  summarizedThrough: number;
  withdrawn: number;
}>;

const NOTHING_SUMMARIZED = -1;
const NEVER = 0;

const freshHeard = (now: number): Heard => ({
  lastActivityAt: now,
  spokeSinceQuestion: false,
  lastSummaryAt: now,
  summarizedThrough: NOTHING_SUMMARIZED,
  withdrawn: 0,
});

const keep = <Value>(initial: Value): Atom.Writable<Value> => Atom.keepAlive(Atom.make(initial));

const phaseAtom = keep<Phase>({ status: "interview" });
const entriesAtom = keep<readonly Entry[]>([]);
const interimAtom = keep("");
const hearingAtom = keep(false);
const askingAtom = keep<Asking>({ status: "idle" });
const summaryAtom = keep<SummaryState>({ status: "empty" });
const listeningAtom = keep<Listening>({ status: "off" });
const heardAtom = keep<Heard>(freshHeard(NEVER));
const recognitionAtom = keep<Option.Option<Recognition>>(Option.none());
const answerDraftAtom = keep("");
const progressAtom = keep<readonly Progress[]>([]);
const nudgeAtom = keep<Option.Option<Nudge>>(Option.none());
const staleAtom = keep(false);
const previousThemeAtom = keep(storedPrevious());
const panelAtom = keep<Panel>("points");
const savingAtom = keep<Saving>({ status: "idle" });
const recordingAtom = keep<Recording>({ id: "", startedAt: NEVER });

const summaryOf = (state: SummaryState): Option.Option<InterviewSummary> => {
  if (state.status === "empty") {
    return Option.none();
  }
  return state.summary;
};

/** @internal */
export {
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  freshHeard,
  heardAtom,
  hearingAtom,
  interimAtom,
  listeningAtom,
  nudgeAtom,
  panelAtom,
  phaseAtom,
  previousThemeAtom,
  progressAtom,
  recognitionAtom,
  recordingAtom,
  savingAtom,
  staleAtom,
  summaryAtom,
  summaryOf,
};
export type {
  Asking,
  Entry,
  Heard,
  Input,
  Listening,
  Nudge,
  Panel,
  Phase,
  Progress,
  Rating,
  Recording,
  Saving,
  SummaryState,
};
