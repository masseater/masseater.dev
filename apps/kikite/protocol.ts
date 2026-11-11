import { Schema } from "effect";

import { MODEL_IDS, STRATEGY_IDS } from "./strategies.ts";

const Setup = Schema.Struct({ theme: Schema.String, goal: Schema.String });

const Summary = Schema.Struct({
  points: Schema.Array(Schema.String),
  open: Schema.Array(Schema.String),
  next: Schema.Array(Schema.String),
});

const SummaryRequest = Schema.Struct({
  setup: Setup,
  previous: Schema.OptionFromNullOr(Summary),
  transcript: Schema.String,
});

const QuestionRequest = Schema.Struct({
  setup: Setup,
  strategy: Schema.Literals(STRATEGY_IDS),
  model: Schema.Literals(MODEL_IDS),
  summary: Schema.OptionFromNullOr(Summary),
  recent: Schema.String,
  asked: Schema.Array(Schema.String),
});

type InterviewSetup = typeof Setup.Type;
type InterviewSummary = typeof Summary.Type;
type SummaryBody = typeof SummaryRequest.Type;
type QuestionBody = typeof QuestionRequest.Type;

const SUMMARY_PATH = "/api/summary";
const QUESTION_PATH = "/api/question";

const REASON_LABEL = "根拠";
const QUESTION_LABEL = "質問";
const ERROR_LABEL = "エラー";

export {
  ERROR_LABEL,
  QUESTION_LABEL,
  QUESTION_PATH,
  QuestionRequest,
  REASON_LABEL,
  SUMMARY_PATH,
  Summary,
  SummaryRequest,
};
export type { InterviewSetup, InterviewSummary, QuestionBody, SummaryBody };
