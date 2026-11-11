import { Schema } from "effect";

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

type InterviewSummary = typeof Summary.Type;
type SummaryBody = typeof SummaryRequest.Type;
type QuestionBody = typeof QuestionRequest.Type;

const SUMMARY_PATH = "/api/summary";
const QUESTION_PATH = "/api/question";

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
  STRATEGY_LABEL,
  SUMMARY_PATH,
  Summary,
  SummaryRequest,
};
export type { InterviewSummary, QuestionBody, SummaryBody };
