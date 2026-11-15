const HOST = "kikite.masseater.dev";

const API_PORT = 8080;
const DEV_API_PORT = 5181;

const INTERVIEWER_IMAGE = "InterviewerImage";
const INTERVIEWER_INSTANCE = "standard-1";
const INTERVIEWER_IDLE = { minutes: 10 } as const;
const INTERVIEWER_STARTUP = { probes: 60, spacing: "500 millis" } as const;

const TELEMETRY_SERVICE = "kikite-web";
const TRACES_PATH = "/api/otlp/v1/traces";

const SUMMARY_MODEL = "opus";
const QUESTION_MODEL = "opus";
const RESEARCH_MODEL = "opus";
const CORRECTION_MODEL = "sonnet";
const RESEARCH_TOOLING = { tools: ["WebSearch", "WebFetch"], maxTurns: 8 } as const;

export {
  API_PORT,
  CORRECTION_MODEL,
  DEV_API_PORT,
  HOST,
  INTERVIEWER_IDLE,
  INTERVIEWER_IMAGE,
  INTERVIEWER_INSTANCE,
  INTERVIEWER_STARTUP,
  QUESTION_MODEL,
  RESEARCH_MODEL,
  RESEARCH_TOOLING,
  SUMMARY_MODEL,
  TELEMETRY_SERVICE,
  TRACES_PATH,
};
