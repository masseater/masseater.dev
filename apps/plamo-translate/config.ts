const HOST = "translate.masseater.dev";

const MODEL_IMAGE = "PlamoImage";
const MODEL_NAME = "plamo-3-translate-0.8b";
const MODEL_PORT = 8080;
const MODEL_INSTANCE = "standard-1";
const MODEL_IDLE = { minutes: 10 } as const;
const MODEL_STARTUP = { probes: 180, spacing: "1 second" } as const;

const CHUNK_CHARACTERS = 1000;
const TOKENS_PER_CHARACTER = 3;
const SPARE_TOKENS = 256;
const MAX_TOKENS = 8192;

export {
  CHUNK_CHARACTERS,
  HOST,
  MAX_TOKENS,
  MODEL_IDLE,
  MODEL_IMAGE,
  MODEL_INSTANCE,
  MODEL_NAME,
  MODEL_PORT,
  MODEL_STARTUP,
  SPARE_TOKENS,
  TOKENS_PER_CHARACTER,
};
