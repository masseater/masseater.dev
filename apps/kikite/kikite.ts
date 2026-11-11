const HOST = "kikite.masseater.dev";

const API_PORT = 8080;
const DEV_API_PORT = 5181;

const INTERVIEWER_IMAGE = "InterviewerImage";
const INTERVIEWER_INSTANCE = "standard-1";
const INTERVIEWER_IDLE = { minutes: 10 } as const;
const INTERVIEWER_STARTUP = { probes: 60, spacing: "500 millis" } as const;

const SUMMARY_MODEL = "sonnet";
const QUESTION_MODEL = "sonnet";

export {
  API_PORT,
  DEV_API_PORT,
  HOST,
  INTERVIEWER_IDLE,
  INTERVIEWER_IMAGE,
  INTERVIEWER_INSTANCE,
  INTERVIEWER_STARTUP,
  QUESTION_MODEL,
  SUMMARY_MODEL,
};
