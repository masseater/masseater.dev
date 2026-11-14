import { Schema } from "effect";

import { STRATEGY_IDS } from "#strategies";

const Summary = Schema.Struct({
  theme: Schema.String,
  points: Schema.Array(Schema.String),
  open: Schema.Array(Schema.String),
  next: Schema.Array(Schema.String),
});

const SummaryRequest = Schema.Struct({
  previous: Schema.OptionFromNullOr(Summary),
  transcript: Schema.String,
});

const QuestionRequest = Schema.Struct({
  summary: Schema.OptionFromNullOr(Summary),
  recent: Schema.String,
  asked: Schema.Array(Schema.String),
});

const SpeechInput = Schema.Literals(["voice", "typed"]);
const AskedStrategy = Schema.OptionFromNullOr(Schema.Literals(STRATEGY_IDS));
const QuestionRating = Schema.Literals(["unrated", "good", "off"]);

const SpokenEntry = Schema.Struct({
  kind: Schema.Literal("speech"),
  id: Schema.Finite,
  at: Schema.Finite,
  text: Schema.String,
  by: SpeechInput,
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

const SessionRecord = Schema.Struct({
  startedAt: Schema.Finite,
  entries: Schema.Array(SessionEntry),
  progress: Schema.Array(SessionProgress),
  withdrawn: Schema.Finite,
  summary: Schema.OptionFromNullOr(Summary),
});

const SessionListing = Schema.Struct({
  id: Schema.String,
  startedAt: Schema.Finite,
  updatedAt: Schema.Finite,
  theme: Schema.String,
  entries: Schema.Finite,
});

const SessionId = Schema.String.check(Schema.isPattern(/^[\da-f-]{36}$/u));

type InterviewSummary = typeof Summary.Type;
type RecordedEntry = typeof SessionEntry.Type;
type RecordedProgress = typeof SessionProgress.Type;
type RecordedSession = typeof SessionRecord.Type;
type SummaryBody = typeof SummaryRequest.Type;
type QuestionBody = typeof QuestionRequest.Type;

const SUMMARY_PATH = "/api/summary";
const QUESTION_PATH = "/api/question";
const SESSIONS_PATH = "/api/sessions";

const STRATEGY_LABEL = "方針";
const REASON_LABEL = "根拠";
const QUESTION_LABEL = "質問";
const ERROR_LABEL = "エラー";

export {
  ERROR_LABEL,
  QUESTION_LABEL,
  QUESTION_PATH,
  QuestionRequest,
  REASON_LABEL,
  SESSIONS_PATH,
  STRATEGY_LABEL,
  SUMMARY_PATH,
  SessionId,
  SessionListing,
  SessionRecord,
  Summary,
  SummaryRequest,
};
export type {
  InterviewSummary,
  QuestionBody,
  RecordedEntry,
  RecordedProgress,
  RecordedSession,
  SummaryBody,
};
