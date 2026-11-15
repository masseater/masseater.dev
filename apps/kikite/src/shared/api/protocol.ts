import { Schema } from "effect";

import { STRATEGY_IDS } from "#strategies";

export const Summary = Schema.Struct({
  theme: Schema.String,
  points: Schema.Array(Schema.String),
  open: Schema.Array(Schema.String),
  next: Schema.Array(Schema.String),
});

export const SummaryRequest = Schema.Struct({
  previous: Schema.OptionFromNullOr(Summary),
  transcript: Schema.String,
});

const Lead = Schema.Struct({
  topic: Schema.String,
  detail: Schema.String,
  source: Schema.String,
});

export const QuestionRequest = Schema.Struct({
  summary: Schema.OptionFromNullOr(Summary),
  recent: Schema.String,
  asked: Schema.Array(Schema.String),
  leads: Schema.Array(Lead),
});

export const ResearchAsk = Schema.Struct({
  summary: Summary,
  recent: Schema.String,
  known: Schema.Array(Lead),
});

export const ResearchRequest = Schema.Struct({
  ...ResearchAsk.fields,
  memory: Schema.Array(Schema.String),
});

export const Research = Schema.Struct({ leads: Schema.Array(Lead) });

const HeardLine = Schema.Struct({ id: Schema.Finite, text: Schema.String });

export const CorrectionRequest = Schema.Struct({
  context: Schema.String,
  lines: Schema.Array(HeardLine),
});

export const Correction = Schema.Struct({ lines: Schema.Array(HeardLine) });

const SpeechInput = Schema.Literals(["voice", "typed"]);
const AskedStrategy = Schema.OptionFromNullOr(Schema.Literals(STRATEGY_IDS));
const QuestionRating = Schema.Literals(["unrated", "good", "off"]);

const SpokenEntry = Schema.Struct({
  kind: Schema.Literal("speech"),
  id: Schema.Finite,
  at: Schema.Finite,
  text: Schema.String,
  by: SpeechInput,
  raw: Schema.optionalKey(Schema.String),
});

const AskedEntry = Schema.Struct({
  kind: Schema.Literal("question"),
  id: Schema.Finite,
  at: Schema.Finite,
  strategy: AskedStrategy,
  reason: Schema.String,
  question: Schema.String,
  rating: QuestionRating,
});

const SessionEntry = Schema.Union([SpokenEntry, AskedEntry]);

const SessionProgress = Schema.Struct({
  at: Schema.Finite,
  open: Schema.Finite,
  next: Schema.Finite,
});

export const SessionRecord = Schema.Struct({
  startedAt: Schema.Finite,
  entries: Schema.Array(SessionEntry),
  progress: Schema.Array(SessionProgress),
  withdrawn: Schema.Finite,
  summary: Schema.OptionFromNullOr(Summary),
  leads: Schema.optionalKey(Schema.Array(Lead)),
});

export const SessionListing = Schema.Struct({
  id: Schema.String,
  startedAt: Schema.Finite,
  updatedAt: Schema.Finite,
  theme: Schema.String,
  entries: Schema.Finite,
});

export const SessionId = Schema.String.check(Schema.isPattern(/^[\da-f-]{36}$/u));

export type InterviewSummary = typeof Summary.Type;
export type RecordedEntry = typeof SessionEntry.Type;
export type RecordedProgress = typeof SessionProgress.Type;
export type RecordedSession = typeof SessionRecord.Type;
export type SummaryBody = typeof SummaryRequest.Type;
export type QuestionBody = typeof QuestionRequest.Type;
export type InterviewLead = typeof Lead.Type;
export type ResearchBody = typeof ResearchRequest.Type;
export type ResearchAskBody = typeof ResearchAsk.Type;
export type CorrectionBody = typeof CorrectionRequest.Type;
export type HeardText = typeof HeardLine.Type;

export const SUMMARY_PATH = "/api/summary";
export const QUESTION_PATH = "/api/question";
export const SESSIONS_PATH = "/api/sessions";
export const RESEARCH_PATH = "/api/research";
export const CORRECTION_PATH = "/api/correction";

export const STRATEGY_LABEL = "方針";
export const REASON_LABEL = "根拠";
export const QUESTION_LABEL = "質問";
export const ERROR_LABEL = "エラー";
