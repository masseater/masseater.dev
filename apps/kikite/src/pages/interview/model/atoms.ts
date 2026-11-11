import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { activatedNow } from "#/pages/interview/lib/activation";
import type { Recognition } from "#/pages/interview/lib/recognition";
import type { InterviewSummary } from "#protocol";
import type { StrategyId } from "#strategies";

import { storedPrevious, storedSpeaker } from "./memory.ts";

type Rating = "unrated" | "good" | "off";

type Input = "voice" | "typed";

type Entry =
  | Readonly<{ kind: "speech"; id: number; at: number; text: string; by: Input }>
  | Readonly<{
      kind: "question";
      id: number;
      at: number;
      strategy: Option.Option<StrategyId>;
      reason: string;
      question: string;
      rating: Rating;
    }>;

type Progress = Readonly<{ at: number; open: number; next: number }>;

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
  | Readonly<{ status: "speaking" }>
  | Readonly<{ status: "typing" }>
  | Readonly<{ status: "unsupported" }>
  | Readonly<{ status: "failed"; message: string }>;

type Phase = Readonly<{ status: "interview" }> | Readonly<{ status: "report" }>;

type Nudge = Readonly<{ level: number; text: string }>;

type Heard = Readonly<{
  lastActivityAt: number;
  spokeSinceQuestion: boolean;
  lastInput: Input;
  lastSummaryAt: number;
  summarizedThrough: number;
  withdrawn: number;
}>;

const NOTHING_SUMMARIZED = -1;
const NEVER = 0;

const freshHeard = (now: number): Heard => ({
  lastActivityAt: now,
  spokeSinceQuestion: false,
  lastInput: "voice",
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
const speakerAtom = keep(storedSpeaker());
const activatedAtom = keep(activatedNow());
const previousThemeAtom = keep(storedPrevious());

const summaryOf = (state: SummaryState): Option.Option<InterviewSummary> => {
  if (state.status === "empty") {
    return Option.none();
  }
  return state.summary;
};

/** @internal */
export {
  activatedAtom,
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  freshHeard,
  heardAtom,
  hearingAtom,
  interimAtom,
  listeningAtom,
  nudgeAtom,
  phaseAtom,
  previousThemeAtom,
  progressAtom,
  recognitionAtom,
  speakerAtom,
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
  Phase,
  Progress,
  Rating,
  SummaryState,
};
