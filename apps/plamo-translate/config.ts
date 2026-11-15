export const HOST = "translate.masseater.dev";

export const MODEL_IMAGE = "PlamoImage";
export const MODEL_NAME = "plamo-3-translate-0.8b";
export const MODEL_PORT = 8080;
export const MODEL_INSTANCE = "standard-1";
export const MODEL_IDLE = { minutes: 10 } as const;
export const MODEL_STARTUP = { probes: 180, spacing: "1 second" } as const;

export const CHUNK_CHARACTERS = 1000;
export const TOKENS_PER_CHARACTER = 3;
export const SPARE_TOKENS = 256;
export const MAX_TOKENS = 8192;
