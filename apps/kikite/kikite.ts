export const HOST = "kikite.masseater.dev";

export const API_PORT = 8080;
export const DEV_API_PORT = 5181;

export const INTERVIEWER_IMAGE = "InterviewerImage";
export const INTERVIEWER_INSTANCE = "standard-1";
export const INTERVIEWER_IDLE = { minutes: 10 } as const;
export const INTERVIEWER_STARTUP = { probes: 60, spacing: "500 millis" } as const;

export const TELEMETRY_SERVICE = "kikite-web";
export const TRACES_PATH = "/api/otlp/v1/traces";

export const SUMMARY_MODEL = "opus";
export const QUESTION_MODEL = "opus";
export const RESEARCH_MODEL = "opus";
export const CORRECTION_MODEL = "sonnet";
export const RESEARCH_TOOLING = { tools: ["WebSearch", "WebFetch"], maxTurns: 8 } as const;
