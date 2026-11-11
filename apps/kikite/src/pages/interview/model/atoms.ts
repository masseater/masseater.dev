import { Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Recognition } from "#/pages/interview/lib/recognition";
import type { InterviewSetup, InterviewSummary } from "#protocol";
import type { ModelId, StrategyId } from "#strategies";

type Settings = Readonly<{
  strategy: StrategyId;
  model: ModelId;
  compare: boolean;
  speak: boolean;
  silenceSeconds: number;
  summarySeconds: number;
}>;

type Rating = "unrated" | "good" | "off";

type Entry =
  | Readonly<{ kind: "speech"; id: number; at: number; text: string }>
  | Readonly<{
      kind: "question";
      id: number;
      at: number;
      strategy: StrategyId;
      reason: string;
      question: string;
      rating: Rating;
    }>;

type Progress = Readonly<{ at: number; open: number; next: number }>;

type Draft = Readonly<{
  strategy: StrategyId;
  text: string;
  status: "streaming" | "done" | "failed";
}>;

type Asking =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "drafting"; drafts: readonly Draft[] }>
  | Readonly<{ status: "choosing"; drafts: readonly Draft[] }>;

type SummaryState =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "updating"; summary: Option.Option<InterviewSummary> }>
  | Readonly<{ status: "ready"; summary: Option.Option<InterviewSummary> }>
  | Readonly<{ status: "failed"; summary: Option.Option<InterviewSummary>; message: string }>;

type Listening =
  | Readonly<{ status: "off" }>
  | Readonly<{ status: "listening" }>
  | Readonly<{ status: "muted" }>
  | Readonly<{ status: "unsupported" }>
  | Readonly<{ status: "failed"; message: string }>;

type Candidate = Readonly<{ strategy: StrategyId; reason: string; question: string }>;

type Choice = Readonly<{ chosen: StrategyId; candidates: readonly Candidate[] }>;

type Phase =
  | Readonly<{ status: "setup" }>
  | Readonly<{ status: "interview"; setup: InterviewSetup }>
  | Readonly<{ status: "report"; setup: InterviewSetup }>;

type Heard = Readonly<{
  lastSpeechAt: number;
  spokeSinceQuestion: boolean;
  lastSummaryAt: number;
  summarizedThrough: number;
  withdrawn: number;
}>;

const DEFAULT_SETTINGS: Settings = {
  strategy: "concrete",
  model: "sonnet",
  compare: false,
  speak: true,
  silenceSeconds: 2.5,
  summarySeconds: 20,
};

const NOTHING_SUMMARIZED = -1;

const FRESH_HEARD: Heard = {
  lastSpeechAt: 0,
  spokeSinceQuestion: false,
  lastSummaryAt: 0,
  summarizedThrough: NOTHING_SUMMARIZED,
  withdrawn: 0,
};

const keep = <Value>(initial: Value): Atom.Writable<Value> => Atom.keepAlive(Atom.make(initial));

const phaseAtom = keep<Phase>({ status: "setup" });
const settingsAtom = keep<Settings>(DEFAULT_SETTINGS);
const entriesAtom = keep<readonly Entry[]>([]);
const interimAtom = keep("");
const askingAtom = keep<Asking>({ status: "idle" });
const summaryAtom = keep<SummaryState>({ status: "empty" });
const listeningAtom = keep<Listening>({ status: "off" });
const choicesAtom = keep<readonly Choice[]>([]);
const heardAtom = keep<Heard>(FRESH_HEARD);
const recognitionAtom = keep<Option.Option<Recognition>>(Option.none());
const setupDraftAtom = keep<InterviewSetup>({ theme: "", goal: "" });
const answerDraftAtom = keep("");
const settingsOpenAtom = keep(false);
const progressAtom = keep<readonly Progress[]>([]);

const summaryOf = (state: SummaryState): Option.Option<InterviewSummary> => {
  if (state.status === "empty") {
    return Option.none();
  }
  return state.summary;
};

/** @internal */
export {
  FRESH_HEARD,
  answerDraftAtom,
  askingAtom,
  choicesAtom,
  entriesAtom,
  heardAtom,
  interimAtom,
  listeningAtom,
  phaseAtom,
  progressAtom,
  recognitionAtom,
  settingsAtom,
  settingsOpenAtom,
  setupDraftAtom,
  summaryAtom,
  summaryOf,
};
export type {
  Asking,
  Candidate,
  Choice,
  Draft,
  Entry,
  Heard,
  Listening,
  Phase,
  Progress,
  Rating,
  Settings,
  SummaryState,
};
